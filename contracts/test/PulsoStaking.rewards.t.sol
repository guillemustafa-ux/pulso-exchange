// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PulsoToken} from "../src/PulsoToken.sol";
import {PulsoStaking} from "../src/PulsoStaking.sol";

/// @title PulsoStakingRewardsTest
/// @notice Suite adversarial de la matemática de recompensas. Nace de una auditoría
///         interna que encontró el edge case clásico del patrón Synthetix en nuestro
///         propio deploy v1: `notifyRewardAmount` con `totalSupply == 0` arranca el
///         reloj y todo lo goteado hasta el primer stake queda huérfano e
///         irrecuperable (~917 PULSO orfanados en Sepolia antes del fix).
contract PulsoStakingRewardsTest is Test {
    PulsoToken public token;
    PulsoStaking public staking;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant REWARD_AMOUNT = 90_000 * 10 ** 18;

    function setUp() public {
        vm.warp(1_700_000_000); // reloj realista — Foundry arranca en timestamp=1
        token = new PulsoToken();
        staking = new PulsoStaking(address(token), address(this));

        token.transfer(alice, 100_000 * 10 ** 18);
        token.transfer(bob, 100_000 * 10 ** 18);
    }

    function _stake(address who, uint256 amount) internal {
        vm.startPrank(who);
        token.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();
    }

    function _notify(uint256 amount) internal {
        token.approve(address(staking), amount);
        staking.notifyRewardAmount(amount);
    }

    /// @notice El fix del bug v1: arrancar la distribución sin stakers revierte,
    ///         porque ese goteo no se acreditaría a nadie y quedaría bloqueado
    ///         (recoverERC20 no puede tocar stakingToken).
    function test_RevertWhen_NotifyWithZeroSupply() public {
        assertEq(staking.totalSupply(), 0);

        token.approve(address(staking), REWARD_AMOUNT);
        vm.expectRevert(PulsoStaking.NoStakers.selector);
        staking.notifyRewardAmount(REWARD_AMOUNT);
    }

    /// @notice Demostración del escenario del bug v1 (pre-fix, documental): si el
    ///         período corre un tramo con totalSupply == 0 (todos salieron), lo
    ///         goteado en ese tramo no se acredita a nadie. El fix evita ARRANCAR
    ///         así, pero el drenado total a mitad de período sigue orfanando ese
    ///         tramo — trade-off conocido del patrón, acá cuantificado.
    function test_OrphanedRewards_WhenEveryoneExitsMidPeriod() public {
        _stake(alice, 1_000e18);
        _notify(REWARD_AMOUNT);

        // Alice cobra 10 días y se va — el pool queda sin stakers 10 días.
        vm.warp(block.timestamp + 10 days);
        vm.prank(alice);
        staking.exit();

        uint256 orphanStart = block.timestamp;
        vm.warp(block.timestamp + 10 days);

        // Bob entra al día 20 y cobra los últimos 10 días.
        _stake(bob, 1_000e18);
        vm.warp(block.timestamp + 10 days);

        uint256 rate = staking.rewardRate();
        uint256 orphaned = rate * 10 days; // el tramo sin stakers

        // Lo repartido + lo huérfano ≈ el pool total (dust de truncamiento aparte).
        uint256 claimedAlice = token.balanceOf(alice) - (100_000e18); // exit devolvió stake + rewards
        uint256 pendingBob = staking.earned(bob);
        assertApproxEqAbs(claimedAlice + pendingBob + orphaned, REWARD_AMOUNT, 1e6);

        // Y ese tramo huérfano quedó de verdad bloqueado: nadie lo puede reclamar
        // y recoverERC20 no puede tocar el stakingToken.
        assertGt(orphaned, 0);
        assertGt(orphanStart, 0);
        vm.expectRevert(PulsoStaking.CannotRecoverStakingToken.selector);
        staking.recoverERC20(address(token), orphaned);
    }

    /// @notice Proporcionalidad: con Alice 2/3 y Bob 1/3 del stake, las recompensas
    ///         se reparten 2:1 (tolerancia de dust por truncamiento).
    function test_TwoStakers_ProportionalRewards() public {
        _stake(alice, 2_000e18);
        _stake(bob, 1_000e18);
        _notify(REWARD_AMOUNT);

        vm.warp(block.timestamp + 15 days);

        uint256 earnedAlice = staking.earned(alice);
        uint256 earnedBob = staking.earned(bob);

        assertGt(earnedBob, 0);
        assertApproxEqRel(earnedAlice, earnedBob * 2, 1e12); // 0.0001% de tolerancia
    }

    /// @notice Un staker que entra a mitad de período solo cobra desde su entrada:
    ///         no puede "robar" retroactivo de lo ya goteado.
    function test_LateStaker_EarnsOnlyFromEntry() public {
        _stake(alice, 1_000e18);
        _notify(REWARD_AMOUNT);

        vm.warp(block.timestamp + 15 days);
        _stake(bob, 1_000e18);
        uint256 bobEntryEarned = staking.earned(bob);
        assertEq(bobEntryEarned, 0);

        vm.warp(block.timestamp + 15 days);

        // Alice: 15 días sola + 15 días al 50%. Bob: 15 días al 50%.
        // => Alice ≈ 3x Bob.
        assertApproxEqRel(staking.earned(alice), staking.earned(bob) * 3, 1e12);
    }

    /// @notice Matemática del leftover: notify a mitad de período incorpora lo no
    ///         goteado al nuevo período (nada se pierde ni se duplica).
    function test_NotifyMidPeriod_LeftoverMath() public {
        _stake(alice, 1_000e18);
        _notify(REWARD_AMOUNT);

        uint256 firstRate = staking.rewardRate();
        uint256 duration = staking.rewardsDuration();

        vm.warp(block.timestamp + 10 days);

        uint256 remaining = staking.periodFinish() - block.timestamp;
        uint256 leftover = remaining * firstRate;

        uint256 secondReward = 30_000e18;
        _notify(secondReward);

        assertEq(staking.rewardRate(), (secondReward + leftover) / duration);
        assertEq(staking.periodFinish(), block.timestamp + duration);
    }

    /// @notice El owner no puede llevarse el stakingToken vía recoverERC20 bajo
    ///         ninguna denominación — ni principal ni recompensas.
    function test_RecoverERC20_CannotTouchStakingToken() public {
        _stake(alice, 1_000e18);
        _notify(REWARD_AMOUNT);

        vm.expectRevert(PulsoStaking.CannotRecoverStakingToken.selector);
        staking.recoverERC20(address(token), 1);
    }

    /// @notice Solvencia de punta a punta: tras un ciclo completo (dos stakers,
    ///         período entero, claims y exits), el contrato nunca queda debiendo:
    ///         balance final >= dust, y cada uno cobró lo suyo.
    function test_Solvency_FullCycleClaimsCovered() public {
        _stake(alice, 2_000e18);
        _stake(bob, 1_000e18);
        _notify(REWARD_AMOUNT);

        vm.warp(block.timestamp + 31 days); // período completo terminado

        vm.prank(alice);
        staking.exit();
        vm.prank(bob);
        staking.exit();

        // Nadie quedó con deuda pendiente y el contrato retiene solo dust.
        assertEq(staking.earned(alice), 0);
        assertEq(staking.earned(bob), 0);
        assertEq(staking.totalSupply(), 0);
        assertLt(token.balanceOf(address(staking)), 1e6); // solo dust de truncamiento
    }
}
