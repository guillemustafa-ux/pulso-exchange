// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title PulsoToken
/// @notice ERC20 básico de prueba con faucet público para Pulso Exchange.
/// @dev Limitación conocida y aceptada para testnet: el faucet es sybileable
///      (N wallets → 100·N PULSO/día, sin costo real en Sepolia) y el mismo token
///      se stakea en PulsoStaking, así que un sybil puede diluir las recompensas
///      de stakers honestos. En mainnet esto sería crítico; acá es una demo
///      educativa y el trade-off está declarado a propósito.
contract PulsoToken is ERC20, Ownable2Step, Pausable {
    /// @notice Cantidad inicial minteada al deployer (1,000,000 PULSO).
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    /// @notice Máximo de PULSO que se puede reclamar por llamada al faucet.
    uint256 public constant FAUCET_AMOUNT = 100 * 10 ** 18;

    /// @notice Cooldown entre claims del faucet, por address.
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    /// @notice Timestamp del último claim del faucet por address.
    mapping(address => uint256) public lastClaim;

    /// @notice Se intentó reclamar el faucet antes de que termine el cooldown.
    /// @param nextClaimAt Timestamp a partir del cual se podrá reclamar de nuevo.
    error FaucetCooldown(uint256 nextClaimAt);

    /// @notice Emitido cuando una address reclama tokens del faucet.
    event FaucetClaimed(address indexed user, uint256 amount);

    constructor() ERC20("Pulso Token", "PULSO") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice Reclama FAUCET_AMOUNT de PULSO. Máximo una vez cada FAUCET_COOLDOWN por address.
    /// @dev Sin ReentrancyGuard a propósito: `_mint` de OZ no tiene hooks ni llamadas
    ///      externas, el guard sería peso muerto en gas.
    function faucet() external whenNotPaused {
        uint256 nextClaimAt = lastClaim[msg.sender] + FAUCET_COOLDOWN;
        if (block.timestamp < nextClaimAt) {
            revert FaucetCooldown(nextClaimAt);
        }

        // Effects
        lastClaim[msg.sender] = block.timestamp;

        // Interactions
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Pausa el faucet de emergencia (las transferencias ERC20 siguen operando). Solo owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Reanuda la operación normal. Solo owner.
    function unpause() external onlyOwner {
        _unpause();
    }
}
