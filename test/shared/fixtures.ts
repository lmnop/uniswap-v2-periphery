import { Wallet, Contract } from 'ethers'
import { Web3Provider } from 'ethers/providers'
import { deployContract } from 'ethereum-waffle'

import { expandTo18Decimals } from './utilities'

import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'

import ERC20 from '../../build/ERC20.json'
import WETH9 from '../../build/WETH9.json'
import UniswapV1Exchange from '../../build/UniswapV1Exchange.json'
import UniswapV1Factory from '../../build/UniswapV1Factory.json'
import UniswapV2Router01 from '../../build/UniswapV2Router01.json'
import UniswapV2Migrator from '../../build/UniswapV2Migrator.json'
import UniswapV2Router02 from '../../build/UniswapV2Router02.json'
import UniswapV3Router01 from '../../build/UniswapV3Router01.json'
import RouterEventEmitter from '../../build/RouterEventEmitter.json'

const overrides = {
  gasLimit: 9999999
}

interface V2Fixture {
  token0: Contract
  token1: Contract
  WETH: Contract
  WETHPartner: Contract
  factoryV1: Contract
  factoryV2: Contract
  router01: Contract
  router02: Contract
  router03: Contract
  routerEventEmitter: Contract
  router: Contract
  migrator: Contract
  WETHExchangeV1: Contract
  pairAB: Contract
  WETHPair: Contract
  WETHAPair: Contract
  WETHBPair: Contract
}

export async function v2Fixture(provider: Web3Provider, wallets: Wallet[]): Promise<V2Fixture> {
  // get primary wallet
  const wallet = wallets[0]

  // deploy tokens
  const tokenA = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)])
  const tokenB = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)])
  const tokenC = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)])
  const WETH = await deployContract(wallet, WETH9)

  // deploy V1
  const factoryV1 = await deployContract(wallet, UniswapV1Factory, [])
  await factoryV1.initializeFactory((await deployContract(wallet, UniswapV1Exchange, [])).address)

  // deploy V2
  const factoryV2 = await deployContract(wallet, UniswapV2Factory, [wallet.address])

  // deploy routers
  const router01 = await deployContract(wallet, UniswapV2Router01, [factoryV2.address, WETH.address], overrides)
  const router02 = await deployContract(wallet, UniswapV2Router02, [factoryV2.address, WETH.address], overrides)
  const router03 = await deployContract(wallet, UniswapV3Router01, [factoryV2.address, WETH.address], overrides)

  // event emitter for testing
  const routerEventEmitter = await deployContract(wallet, RouterEventEmitter, [])

  // deploy migrator
  const migrator = await deployContract(wallet, UniswapV2Migrator, [factoryV1.address, router01.address], overrides)

  // initialize V1
  await factoryV1.createExchange(tokenA.address, overrides)
  const WETHExchangeV1Address = await factoryV1.getExchange(tokenA.address)
  const WETHExchangeV1 = new Contract(WETHExchangeV1Address, JSON.stringify(UniswapV1Exchange.abi), provider).connect(
    wallet
  )

  // Create WETH Token A Pair
  await factoryV2.createPair(WETH.address, tokenA.address)
  const WETHPairAAddress = await factoryV2.getPair(WETH.address, tokenA.address)
  const WETHAPair = new Contract(WETHPairAAddress, JSON.stringify(IUniswapV2Pair.abi), provider).connect(wallet)

  // Create WETH Token C Pair
  await factoryV2.createPair(WETH.address, tokenB.address)
  const WETHPairBAddress = await factoryV2.getPair(WETH.address, tokenB.address)
  const WETHBPair = new Contract(WETHPairBAddress, JSON.stringify(IUniswapV2Pair.abi), provider).connect(wallet)

  // Create Token AB Pair
  await factoryV2.createPair(tokenA.address, tokenB.address)
  const pairABAddress = await factoryV2.getPair(tokenA.address, tokenB.address)
  const pairAB = new Contract(pairABAddress, JSON.stringify(IUniswapV2Pair.abi), provider).connect(wallet)

  const token0Address = await pairAB.token0()
  const token0 = tokenA.address === token0Address ? tokenA : tokenB
  const token1 = tokenA.address === token0Address ? tokenB : tokenA

  return {
    token0,
    token1,
    WETH,
    WETHPartner: token0,
    factoryV1,
    factoryV2,
    router01,
    router02,
    router03,
    router: router02, // the default router, 01 had a minor bug
    routerEventEmitter,
    migrator,
    WETHExchangeV1,
    pairAB,
    WETHPair: WETHAPair,
    WETHAPair,
    WETHBPair
  }
}
