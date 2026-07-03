// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PulsoToken} from "../src/PulsoToken.sol";

contract PulsoTokenTest is Test {
    PulsoToken public token;

    address public owner;
    address public user = makeAddr("user");

    function setUp() public {
        vm.warp(1_700_000_000); // reloj realista tipo mainnet — Foundry arranca en timestamp=1, lo que rompe el cooldown para claims nunca hechos (lastClaim=0)
        owner = address(this);
        token = new PulsoToken();
    }

    /// @notice Un address llama faucet() y recibe 100 PULSO.
    function testFaucetClaim() public {
        vm.prank(user);
        token.faucet();

        assertEq(token.balanceOf(user), token.FAUCET_AMOUNT());
        assertEq(token.lastClaim(user), block.timestamp);
    }

    /// @notice Una segunda llamada dentro de las 24h revierte con FaucetCooldown.
    function testFaucetCooldown() public {
        vm.prank(user);
        token.faucet();

        uint256 nextClaimAt = block.timestamp + token.FAUCET_COOLDOWN();

        // Avanzamos algo de tiempo, pero seguimos dentro del cooldown.
        vm.warp(block.timestamp + 1 hours);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(PulsoToken.FaucetCooldown.selector, nextClaimAt));
        token.faucet();
    }

    /// @notice Después de que pasan las 24h (vm.warp), el faucet vuelve a funcionar.
    function testFaucetAfterCooldown() public {
        vm.prank(user);
        token.faucet();

        vm.warp(block.timestamp + token.FAUCET_COOLDOWN());

        vm.prank(user);
        token.faucet();

        assertEq(token.balanceOf(user), token.FAUCET_AMOUNT() * 2);
    }

    /// @notice Si el owner pausa el contrato, faucet() revierte.
    function testPauseBlocksFaucet() public {
        token.pause();

        vm.prank(user);
        vm.expectRevert();
        token.faucet();
    }
}
