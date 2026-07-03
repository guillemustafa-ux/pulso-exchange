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
        token = new PulsoToken();
        staking = new PulsoStaking(address(token), address(this));

        handler = new StakingHandler(token, staking);

        // Fondeamos al handler con la mayor parte del supply de PULSO para que pueda
        // repartir entre sus actores al stakear (no notifyRewardAmount: no hace falta
        // testear rewards acá, solo la contabilidad de stake/unstake).
        token.transfer(address(handler), 900_000 * 10 ** 18);

        targetContract(address(handler));
    }

    /// @notice El totalSupply stakeado en el contrato siempre debe coincidir con la
    ///         suma de los balances individuales de todos los stakers conocidos,
    ///         sin importar la secuencia aleatoria de stake()/unstake() ejecutada.
    function invariant_TotalSupplyEqualsSumOfBalances() public view {
        assertEq(staking.totalSupply(), handler.sumOfActorBalances());
    }
}
