pragma solidity =0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@uniswap/lib/contracts/libraries/TransferHelper.sol';

import './interfaces/IUniswapV2Router02.sol';
import './libraries/UniswapV2Library.sol';
import './libraries/SafeMath.sol';
import './interfaces/IERC20.sol';
import './interfaces/IWETH.sol';
import './UniswapV2Router02.sol';

contract UniswapV3Router01 is UniswapV2Router02 {

    constructor(address _factory, address _weth) public UniswapV2Router02(_factory, _weth) {}

    function swapETHForETH(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path.length >= 4, 'UniswapV2Router: PATH TOO SMALL');
        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');
        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');

        amounts = UniswapV2Library.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');

        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]));

        _swap(amounts, path, address(this));

        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);
    }
}
