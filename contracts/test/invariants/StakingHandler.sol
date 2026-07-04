// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PulsoToken} from "../../src/PulsoToken.sol";
import {PulsoStaking} from "../../src/PulsoStaking.sol";

/// @title StakingHandler
/// @notice Handler para invariant testing de PulsoStaking: expone `stake`/`unstake`
///         "fuzzeables" sobre un conjunto acotado de actores. El handler arranca
///         fondeado con PULSO (ver setUp del test de invariante) y reparte a cada
///         actor lo que necesite para poder stakear, evitando reverts espurios por
///         falta de balance/approve que ensuciarían la corrida de invariantes.
contract StakingHandler is Test {
    PulsoToken public token;
    PulsoStaking public staking;

    address[] public actors;

    uint256 public constant MAX_STAKE_PER_CALL = 50_000 * 10 ** 18;

    constructor(PulsoToken _token, PulsoStaking _staking) {
        token = _token;
        staking = _staking;

        for (uint256 i = 0; i < 8; i++) {
            actors.push(address(uint160(uint256(keccak256(abi.encodePacked("pulso-actor", i))))));
        }
    }

    function actorsLength() external view returns (uint256) {
        return actors.length;
    }

    /// @notice Suma de los balances stakeados de todos los actores conocidos por el handler.
    ///         Como el handler es el único punto de entrada fuzzeado (targetContract),
    ///         esta suma cubre a todos los stakers posibles durante la corrida.
    function sumOfActorBalances() public view returns (uint256 sum) {
        for (uint256 i = 0; i < actors.length; i++) {
            sum += staking.balances(actors[i]);
        }
    }

    function stake(uint256 actorSeed, uint256 amount) external {
        address actor = actors[actorSeed % actors.length];
        amount = bound(amount, 1, MAX_STAKE_PER_CALL);

        uint256 actorBalance = token.balanceOf(actor);
        if (actorBalance < amount) {
            uint256 topUp = amount - actorBalance;
            uint256 handlerBalance = token.balanceOf(address(this));
            if (topUp > handlerBalance) {
                topUp = handlerBalance;
            }
            if (topUp > 0) {
                token.transfer(actor, topUp);
            }
        }

        amount = token.balanceOf(actor);
        if (amount == 0) return;

        vm.startPrank(actor);
        token.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();
    }

    function unstake(uint256 actorSeed, uint256 amount) external {
        address actor = actors[actorSeed % actors.length];
        uint256 staked = staking.balances(actor);
        if (staked == 0) return;

        amount = bound(amount, 1, staked);

        vm.prank(actor);
        staking.unstake(amount);
    }

    // -----------------------------------------------------------------------
    // Acciones de rewards — hacen que la corrida ejercite la matemática de
    // distribución completa (warp + notify + claim), no solo la contabilidad
    // de stake/unstake.
    // -----------------------------------------------------------------------

    /// @notice Suma de rewards pendientes (earned) de todos los actores.
    function sumOfActorEarned() public view returns (uint256 sum) {
        for (uint256 i = 0; i < actors.length; i++) {
            sum += staking.earned(actors[i]);
        }
    }

    /// @notice El test transfiere la ownership del staking al handler (Ownable2Step);
    ///         este helper la acepta para poder llamar notifyRewardAmount fuzzeado.
    function acceptStakingOwnership() external {
        staking.acceptOwnership();
    }

    /// @notice Avanza el reloj entre 1 hora y 15 días — sin esto la corrida nunca
    ///         acumularía recompensas y earned() sería siempre 0.
    function warp(uint256 secondsSeed) external {
        vm.warp(block.timestamp + bound(secondsSeed, 1 hours, 15 days));
    }

    function claim(uint256 actorSeed) external {
        address actor = actors[actorSeed % actors.length];
        vm.prank(actor);
        staking.claim();
    }

    /// @notice Fondea y arranca/extiende un período de recompensas con monto fuzzeado.
    ///         try/catch: NoStakers (supply 0) y RewardTooHigh (montos chicos con
    ///         leftover) son reverts legítimos del contrato, no fallas del invariante.
    function notifyRewards(uint256 amountSeed) external {
        uint256 balance = token.balanceOf(address(this));
        if (balance < 1e18) return;

        uint256 amount = bound(amountSeed, 1e18, balance > 20_000e18 ? 20_000e18 : balance);
        token.approve(address(staking), amount);
        try staking.notifyRewardAmount(amount) {} catch {}
    }
}
