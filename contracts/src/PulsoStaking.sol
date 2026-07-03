// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PulsoStaking
/// @notice Staking de un único token (stakingToken) que reparte recompensas del mismo
///         token en función del tiempo, siguiendo el patrón Synthetix `rewardPerTokenStored`.
/// @dev El owner financia el período de recompensas vía `notifyRewardAmount`, que hace
///      pull de `reward` tokens desde el owner hacia el contrato (safeTransferFrom).
contract PulsoStaking is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error CannotRecoverStakingToken();
    error RewardTooHigh();
    error RewardPeriodNotFinished();
    error RewardsDurationIsZero();

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    /// @notice Token que se stakea y en el que se pagan las recompensas.
    IERC20 public immutable stakingToken;

    /// @notice PULSO distribuidos por segundo en total (todo el pool).
    uint256 public rewardRate;

    /// @notice Duración de cada período de distribución de recompensas. Default 30 días.
    uint256 public rewardsDuration = 30 days;

    /// @notice Timestamp en el que termina el período de recompensas activo.
    uint256 public periodFinish;

    /// @notice Último timestamp en el que se actualizó `rewardPerTokenStored`.
    uint256 public lastUpdateTime;

    /// @notice Recompensa acumulada por token stakeado, escalada por 1e18.
    uint256 public rewardPerTokenStored;

    /// @notice `rewardPerTokenStored` ya "cobrado" por cada usuario.
    mapping(address => uint256) public userRewardPerTokenPaid;

    /// @notice Recompensas ya calculadas y pendientes de reclamar por usuario.
    mapping(address => uint256) public rewards;

    /// @notice Balance stakeado por usuario.
    mapping(address => uint256) public balances;

    /// @notice Total stakeado en el contrato.
    uint256 public totalSupply;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardAdded(uint256 reward, uint256 newRewardRate, uint256 periodFinish);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address indexed token, uint256 amount);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(address _stakingToken, address _initialOwner) Ownable(_initialOwner) {
        if (_stakingToken == address(0)) revert ZeroAddress();
        stakingToken = IERC20(_stakingToken);
    }

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Sincroniza `rewardPerTokenStored`/`lastUpdateTime` y, si aplica, las
    ///      recompensas pendientes de `account`, antes de correr la función.
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Último timestamp válido para acumular recompensas (min entre ahora y fin de período).
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /// @notice Recompensa acumulada por token stakeado hasta este momento (escalada 1e18).
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        uint256 timeDelta = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + (timeDelta * rewardRate * 1e18) / totalSupply;
    }

    /// @notice Recompensas pendientes de reclamar para `account`.
    function earned(address account) public view returns (uint256) {
        uint256 rewardPerTokenDelta = rewardPerToken() - userRewardPerTokenPaid[account];
        return (balances[account] * rewardPerTokenDelta) / 1e18 + rewards[account];
    }

    // ---------------------------------------------------------------------
    // Mutating - usuario
    // ---------------------------------------------------------------------

    /// @notice Stakea `amount` de `stakingToken`. Bloqueado si el contrato está pausado.
    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();

        // effects
        totalSupply += amount;
        balances[msg.sender] += amount;

        emit Staked(msg.sender, amount);

        // interaction
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Retira `amount` stakeado. Disponible incluso en pausa para no bloquear fondos.
    function unstake(uint256 amount) public nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        // effects
        totalSupply -= amount;
        balances[msg.sender] -= amount;

        emit Unstaked(msg.sender, amount);

        // interaction
        stakingToken.safeTransfer(msg.sender, amount);
    }

    /// @notice Reclama las recompensas acumuladas. Bloqueado si el contrato está pausado.
    ///         No revierte si no hay recompensas pendientes (no-op), para no romper `exit()`.
    function claim() public nonReentrant whenNotPaused updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) return;

        // effects
        rewards[msg.sender] = 0;

        emit RewardClaimed(msg.sender, reward);

        // interaction
        stakingToken.safeTransfer(msg.sender, reward);
    }

    /// @notice Retira todo el balance stakeado y reclama las recompensas pendientes.
    /// @dev Si el contrato está pausado, la porción `claim()` revierte (whenNotPaused);
    ///      en ese caso el usuario puede llamar `unstake()` directamente para recuperar
    ///      su principal sin verse afectado por la recompensa pausada.
    function exit() external {
        unstake(balances[msg.sender]);
        claim();
    }

    // ---------------------------------------------------------------------
    // Mutating - owner
    // ---------------------------------------------------------------------

    /// @notice Inicia o extiende el período de distribución de recompensas.
    /// @dev Hace pull de `reward` unidades de `stakingToken` desde el owner (msg.sender)
    ///      hacia el contrato para financiar la distribución.
    function notifyRewardAmount(uint256 reward) external onlyOwner nonReentrant updateReward(address(0)) {
        if (reward == 0) revert ZeroAmount();

        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;

        emit RewardAdded(reward, rewardRate, periodFinish);

        // interaction: financia el pool de recompensas.
        stakingToken.safeTransferFrom(msg.sender, address(this), reward);

        // Chequeo de solvencia: el buffer de recompensas (balance total menos lo
        // que es principal stakeado, que pertenece a los stakers) debe alcanzar
        // para cubrir rewardRate * rewardsDuration, evitando overflow/insolvencia.
        uint256 rewardBalance = stakingToken.balanceOf(address(this)) - totalSupply;
        if (rewardRate > rewardBalance / rewardsDuration) revert RewardTooHigh();
    }

    /// @notice Cambia la duración del próximo período. Solo si no hay un período activo.
    function setRewardsDuration(uint256 duration) external onlyOwner {
        if (block.timestamp <= periodFinish) revert RewardPeriodNotFinished();
        if (duration == 0) revert RewardsDurationIsZero();

        rewardsDuration = duration;

        emit RewardsDurationUpdated(duration);
    }

    /// @notice Recupera tokens enviados por error al contrato. Nunca permite retirar stakingToken.
    function recoverERC20(address token, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(stakingToken)) revert CannotRecoverStakingToken();

        emit Recovered(token, amount);

        IERC20(token).safeTransfer(owner(), amount);
    }

    /// @notice Pausa stake() y claim() en caso de emergencia.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Reanuda stake() y claim().
    function unpause() external onlyOwner {
        _unpause();
    }
}
