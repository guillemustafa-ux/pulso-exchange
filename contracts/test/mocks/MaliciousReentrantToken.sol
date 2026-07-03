// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {PulsoStaking} from "../../src/PulsoStaking.sol";

/// @title MaliciousReentrantToken
/// @notice Token ERC20 usado solo en tests: durante `transferFrom` intenta reentrar
///         `PulsoStaking.stake()` para verificar que el `ReentrancyGuard` del staking
///         bloquea la llamada anidada.
contract MaliciousReentrantToken is ERC20 {
    PulsoStaking public staking;
    bool public attack;
    uint256 public attackAmount;

    constructor() ERC20("Malicious", "MAL") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setStaking(PulsoStaking _staking) external {
        staking = _staking;
    }

    /// @notice Arma el ataque: la próxima vez que se ejecute transferFrom, reintenta stake().
    function setAttack(bool _attack, uint256 _amount) external {
        attack = _attack;
        attackAmount = _amount;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        bool ok = super.transferFrom(from, to, amount);

        if (attack) {
            attack = false; // evita loop infinito si por algún motivo no revierte
            staking.stake(attackAmount);
        }

        return ok;
    }
}
