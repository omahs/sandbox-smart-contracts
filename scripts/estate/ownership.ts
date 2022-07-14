import {ethers} from 'hardhat';
import {AddressZero} from '@ethersproject/constants';

async function main() {
  const nodeUrl = process.env.ETH_NODE_URI_POLYGON;
  if (!nodeUrl) {
    throw new Error(`Set the env var ETH_NODE_URI_POLYGON`);
  }
  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_NODE_URI_POLYGON
  );
  const wallet = new ethers.Wallet(pk, provider);

  const args = process.argv.slice(process.argv.indexOf(__filename) + 1);
  if (args.length == 0 || args.length % 3 != 0) {
    console.log('Usage: cmd size x y ... size x y');
    process.exit();
  }
  const landContract = await ethers.getContract('PolygonLand', wallet);
  for (let i = 0; i < args.length; ) {
    const size = parseInt(args[i++]);
    const x0 = parseInt(args[i++]);
    const y0 = parseInt(args[i++]);
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        const x = x0 + k;
        const y = y0 + j;
        const landId = x + y * 408;
        let owner = AddressZero;
        try {
          owner = await landContract.ownerOf(landId);
          // eslint-disable-next-line no-empty
        } catch {}
        console.log('x', x, 'y', y, 'landId', landId, 'owner', owner);
      }
    }
  }
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
