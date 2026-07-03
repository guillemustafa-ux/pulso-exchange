// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PulsoToken} from "../src/PulsoToken.sol";
import {PulsoStaking} from "../src/PulsoStaking.sol";

/// @notice Deploy de PulsoToken + PulsoStaking en Sepolia, fondeo y arranque de recompensas.
contract Deploy is Script {
    uint256 constant REWARD_FUNDING = 100_000 ether;

    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;

        PulsoToken token = new PulsoToken();
        PulsoStaking staking = new PulsoStaking(address(token), deployer);

        // notifyRewardAmount hace pull (transferFrom) de las recompensas — requiere approve previo.
        token.approve(address(staking), REWARD_FUNDING);
        staking.notifyRewardAmount(REWARD_FUNDING);

        vm.stopBroadcast();

        console.log("PulsoToken:", address(token));
        console.log("PulsoStaking:", address(staking));
    }
}
