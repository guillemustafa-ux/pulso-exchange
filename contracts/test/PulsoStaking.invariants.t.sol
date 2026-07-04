// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// StdInvariant provee `targetContract`/`targetSelector` y el runner de invariantes;
// `Test` (forge-std) ya hereda de `StdInvariant`, así que alcanza con importar `Test`.
import {Test} from "forge-std/Test.sol";
import {PulsoToken} from "../src/PulsoToken.sol";
import {PulsoStaking} from "../src/PulsoStaking.sol";
import {StakingHandler} from "./invariants/StakingHandler.sol";

contract PulsoStakingInvariantTest is Test {
    PulsoToken public token;
    PulsoStaking public staking;
    StakingHandler public handler;

    function setUp() public {
        vm.warp(1_700_000_000); // reloj realista — Foundry arranca en timestamp=1
        token = new PulsoToken();
        staking = new PulsoStaking(address(token), address(this));

        handler = new StakingHandler(token, staking);

        // El handler necesita ser owner del staking para fuzzear notifyRewardAmount
        // (Ownable2Step: transferimos y él acepta).
        staking.transferOwnership(address(handler));
        handler.acceptStakingOwnership();

        // Fondeamos al handler con la mayor parte del supply de PULSO: reparte a sus
        // actores para stakear Y fondea períodos de recompensas vía notifyRewards.
        token.transfer(address(handler), 900_000 * 10 ** 18);

        targetContract(address(handler));
    }

    /// @notice El totalSupply stakeado en el contrato siempre debe coincidir con la
    ///         suma de los balances individuales de todos los stakers conocidos,
    ///         sin importar la secuencia aleatoria de stake/unstake/warp/notify/claim.
    function invariant_TotalSupplyEqualsSumOfBalances() public view {
        assertEq(staking.totalSupply(), handler.sumOfActorBalances());
    }

    /// @notice Solvencia: el contrato SIEMPRE puede pagar el principal stakeado más
    ///         todas las recompensas devengadas hasta este instante. Si esto se
    ///         rompiera, algún claim/exit futuro revertiría por falta de fondos.
    ///         (>= y no ==: el truncamiento de rewardRate y los tramos sin stakers
    ///         dejan dust/huérfanos a favor del contrato, nunca en contra.)
    function invariant_SolventForPrincipalPlusEarned() public view {
        assertGe(
            token.balanceOf(address(staking)),
            staking.totalSupply() + handler.sumOfActorEarned()
        );
    }
}
