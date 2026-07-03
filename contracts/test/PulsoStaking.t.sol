// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PulsoToken} from "../src/PulsoToken.sol";
import {PulsoStaking} from "../src/PulsoStaking.sol";
import {MaliciousReentrantToken} from "./mocks/MaliciousReentrantToken.sol";

contract PulsoStakingTest is Test {
    PulsoToken public token;
    PulsoStaking public staking;

    address public owner;
    address public user = makeAddr("user");

    uint256 public constant REWARD_AMOUNT = 100_000 * 10 ** 18;
    uint256 public constant STAKE_AMOUNT = 1_000 * 10 ** 18;

    function setUp() public {
        owner = address(this);
        token = new PulsoToken();
        staking = new PulsoStaking(address(token), owner);

        // Fondea el pool de recompensas (30 días default) antes de que nadie stakee,
        // así el balance del contrato de staking == reward pool + lo que se stakee después.
        token.approve(address(staking), REWARD_AMOUNT);
        staking.notifyRewardAmount(REWARD_AMOUNT);

        // Fondos para el usuario de test.
        token.transfer(user, 10_000 * 10 ** 18);
    }

    function _stakeAsUser(uint256 amount) internal {
        vm.startPrank(user);
        token.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();
    }

    /// @notice Usuario aprueba y stakea 1000 PULSO; balance correcto.
    function testStake() public {
        uint256 userBalanceBefore = token.balanceOf(user);

        _stakeAsUser(STAKE_AMOUNT);

        assertEq(staking.balances(user), STAKE_AMOUNT);
        assertEq(staking.totalSupply(), STAKE_AMOUNT);
        assertEq(token.balanceOf(user), userBalanceBefore - STAKE_AMOUNT);
    }

    /// @notice Stake y luego unstake: los tokens vuelven al usuario.
    function testUnstake() public {
        uint256 userBalanceBefore = token.balanceOf(user);

        _stakeAsUser(STAKE_AMOUNT);

        vm.prank(user);
        staking.unstake(STAKE_AMOUNT);

        assertEq(staking.balances(user), 0);
        assertEq(staking.totalSupply(), 0);
        assertEq(token.balanceOf(user), userBalanceBefore);
    }

    /// @notice Después de 1 día (vm.warp), earned() > 0.
    function testEarned() public {
        _stakeAsUser(STAKE_AMOUNT);

        vm.warp(block.timestamp + 1 days);

        assertGt(staking.earned(user), 0);
    }

    /// @notice claim() transfiere las recompensas al usuario y earned() vuelve a 0.
    function testClaim() public {
        _stakeAsUser(STAKE_AMOUNT);

        vm.warp(block.timestamp + 1 days);

        uint256 earnedBefore = staking.earned(user);
        assertGt(earnedBefore, 0);

        uint256 userBalanceBefore = token.balanceOf(user);

        vm.prank(user);
        staking.claim();

        assertEq(token.balanceOf(user), userBalanceBefore + earnedBefore);
        assertEq(staking.earned(user), 0);
    }

    /// @notice exit() devuelve stake + rewards en una sola tx.
    function testExit() public {
        _stakeAsUser(STAKE_AMOUNT);

        vm.warp(block.timestamp + 1 days);

        uint256 earnedBefore = staking.earned(user);
        assertGt(earnedBefore, 0);
        uint256 userBalanceBefore = token.balanceOf(user);

        vm.prank(user);
        staking.exit();

        assertEq(staking.balances(user), 0);
        assertEq(staking.totalSupply(), 0);
        assertEq(token.balanceOf(user), userBalanceBefore + STAKE_AMOUNT + earnedBefore);
    }

    /// @notice Un token malicioso que intenta reentrar stake() durante el callback de
    ///         transferFrom no puede: el ReentrancyGuard revierte la llamada anidada,
    ///         y por lo tanto también la llamada externa completa.
    function testReentrancyStake() public {
        MaliciousReentrantToken malToken = new MaliciousReentrantToken();
        PulsoStaking malStaking = new PulsoStaking(address(malToken), owner);
        malToken.setStaking(malStaking);

        address attacker = makeAddr("attacker");
        uint256 amount = STAKE_AMOUNT;
        malToken.mint(attacker, amount);

        vm.prank(attacker);
        malToken.approve(address(malStaking), amount);

        malToken.setAttack(true, amount);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSignature("ReentrancyGuardReentrantCall()"));
        malStaking.stake(amount);

        // Ni el stake original ni el reentrante deben haber quedado registrados.
        assertEq(malStaking.balances(attacker), 0);
        assertEq(malStaking.totalSupply(), 0);
    }

    /// @notice Fuzz: cualquier monto entre 1 y totalSupply/2 de PULSO se puede stakear
    ///         correctamente (bound evita underflow/falta de balance).
    function testFuzz_StakeAmount(uint256 amount) public {
        amount = bound(amount, 1, token.totalSupply() / 2);

        token.transfer(user, amount);

        vm.startPrank(user);
        token.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();

        assertEq(staking.balances(user), amount);
        assertEq(staking.totalSupply(), amount);
    }
}
