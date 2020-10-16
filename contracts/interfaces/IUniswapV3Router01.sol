pragma solidity >=0.6.2;

import './IUniswapV2Router02.sol';

interface IUniswapV3Router01 is IUniswapV2Router02 {
    function enableWhitelist(
        address[] calldata addresses
    ) external;
    function disableWhitelist(
        address[] calldata addresses
    ) external;
}
