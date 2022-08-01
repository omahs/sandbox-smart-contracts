import {setupPolygonStarterPack} from './fixtures';
import {waitFor, expectEventWithArgs, increaseTime} from '../../utils';
import {expect} from '../../chai-setup';
import {ethers} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {Wallet, constants} from 'ethers';
const {solidityKeccak256, arrayify} = ethers.utils;

const privateKey =
  '0x4242424242424242424242424242424242424242424242424242424242424242';

type Message = {
  catalystIds: number[];
  catalystQuantities: number[];
  gemIds: number[];
  gemQuantities: number[];
  nonce: number;
};

function signPurchaseMessage(
  privateKey: string,
  message: Message,
  buyer: string
) {
  const hashedData = solidityKeccak256(
    ['uint256[]', 'uint256[]', 'uint256[]', 'uint256[]', 'address', 'uint256'],
    [
      message.catalystIds,
      message.catalystQuantities,
      message.gemIds,
      message.gemQuantities,
      buyer,
      message.nonce,
    ]
  );
  const wallet = new Wallet(privateKey);
  return wallet.signMessage(arrayify(hashedData));
}
// Good test params
const catalystIds = [1, 2, 3, 4];
const catPrices = [
  '5000000000000000000',
  '10000000000000000000',
  '15000000000000000000',
  '100000000000000000000',
];
const gemIds = [1, 2, 3, 4, 5];
const gemPrices = [
  '5000000000000000000',
  '10000000000000000000',
  '5000000000000000000',
  '10000000000000000000',
  '5000000000000000000',
];

// Helper example for calculating spend
function calculateSpend() {
  return BigNumber.from(catPrices[0])
    .add(BigNumber.from(catPrices[1]))
    .add(BigNumber.from(catPrices[2]))
    .add(BigNumber.from(catPrices[3]))
    .add(BigNumber.from(gemPrices[0]).mul(2))
    .add(BigNumber.from(gemPrices[1]).mul(2))
    .add(BigNumber.from(gemPrices[2]).mul(2))
    .add(BigNumber.from(gemPrices[3]).mul(2))
    .add(BigNumber.from(gemPrices[4]).mul(2));
}

// Bad test params
const badCatIds = [1, 2, 3, 7];
const badGemIds = [8, 100, 3, 9, 5];
const zeroCatId = [1, 2, 3, 0];
const zeroGemId = [0, 2, 4, 1, 5];

const TestMessage = {
  catalystIds,
  catalystQuantities: [1, 1, 1, 1],
  gemIds,
  gemQuantities: [2, 2, 2, 2, 2],
  nonce: 0,
};

describe.only('PolygonStarterPack.sol', function () {
  describe('PurchaseValidator.sol', function () {
    it('can get the backend signing wallet', async function () {
      const {
        PolygonStarterPack,
        backendMessageSigner,
      } = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.getSigningWallet()).to.be.equal(
        backendMessageSigner
      );
    });
    it('default admin can set the backend signing wallet', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      expect(await PolygonStarterPackAsAdmin.setSigningWallet(other.address)).to
        .be.ok;
    });
    it('a SigningWallet event is emitted when the signing wallet is updated', async function () {
      const {
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
      } = await setupPolygonStarterPack();
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.setSigningWallet(other.address)
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'SigningWallet'
      );
      const newWallet = event.args[0];
      expect(newWallet).to.be.equal(other.address);
    });
    it('cannot set the signing wallet to zeroAddress', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setSigningWallet(constants.AddressZero)
      ).to.be.revertedWith('WALLET_ZERO_ADDRESS');
    });
    it('if not default admin cannot set the signing wallet', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setSigningWallet(other.address)
      ).to.be.revertedWith(
        'AccessControl: account 0xbcd4042de499d14e55001ccbb24a551f3b954096 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
      );
    });
    it('allows multiple nonce queues', async function () {
      const {
        PolygonStarterPack,
        starterPackAdmin,
        defaultAdminRole,
      } = await setupPolygonStarterPack();
      // TODO:
    });
    it('order of cat IDs should not matter', async function () {
      const {
        PolygonStarterPack,
        starterPackAdmin,
        defaultAdminRole,
      } = await setupPolygonStarterPack();
      // TODO:
    });
    it('order of gem IDs should not matter', async function () {
      const {
        PolygonStarterPack,
        starterPackAdmin,
        defaultAdminRole,
      } = await setupPolygonStarterPack();
      // TODO:
    });
    it('can get nonce for a buyer', async function () {
      const {
        PolygonStarterPack,
        starterPackAdmin,
        defaultAdminRole,
      } = await setupPolygonStarterPack();
      // TODO:
    });
    it('cannot reuse nonce', async function () {
      const {
        PolygonStarterPack,
        starterPackAdmin,
        defaultAdminRole,
      } = await setupPolygonStarterPack();
      // TODO:
    });
  });
  describe('Roles', function () {
    it('default admin should be set', async function () {
      const {
        PolygonStarterPack,
        starterPackAdmin,
        defaultAdminRole,
      } = await setupPolygonStarterPack();
      expect(
        await PolygonStarterPack.hasRole(defaultAdminRole, starterPackAdmin)
      ).to.be.true;
    });
  });
  describe('Setup', function () {
    it('correct receiving wallet has been implemented', async function () {
      const {
        PolygonStarterPack,
        starterPackSaleBeneficiary,
      } = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.getReceivingWallet()).to.be.equal(
        starterPackSaleBeneficiary
      );
    });
  });
  describe('getReceivingWallet', function () {
    it('can view the receiving wallet', async function () {
      const {PolygonStarterPack} = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.getReceivingWallet()).to.be.ok;
    });
  });
  describe('setReceivingWallet', function () {
    it('default admin can set the receiving wallet', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      expect(await PolygonStarterPackAsAdmin.setReceivingWallet(other.address))
        .to.be.ok;
    });
    it('a ReceivingWallet event is emitted when the receiving wallet is updated', async function () {
      const {
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
      } = await setupPolygonStarterPack();
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.setReceivingWallet(other.address)
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'ReceivingWallet'
      );
      const newWallet = event.args[0];
      expect(newWallet).to.be.equal(other.address);
    });
    it('cannot set the receiving wallet to zeroAddress', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setReceivingWallet(constants.AddressZero)
      ).to.be.revertedWith('WALLET_ZERO_ADDRESS');
    });
    it('if not default admin cannot set the receiving wallet', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setReceivingWallet(other.address)
      ).to.be.revertedWith(
        'AccessControl: account 0xbcd4042de499d14e55001ccbb24a551f3b954096 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
      );
    });
  });
  describe('setSANDEnabled', function () {
    it('default admin can set SAND enabled', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      expect(await PolygonStarterPackAsAdmin.setSANDEnabled(true)).to.be.ok;
    });
    it('if not default admin cannot set SAND enabled', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setSANDEnabled(true)
      ).to.be.revertedWith(
        'AccessControl: account 0xbcd4042de499d14e55001ccbb24a551f3b954096 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
      );
    });
    it('default admin can disable SAND', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      expect(await PolygonStarterPackAsAdmin.setSANDEnabled(false)).to.be.ok;
    });
    it('if not default admin cannot disable SAND', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setSANDEnabled(false)
      ).to.be.revertedWith(
        'AccessControl: account 0xbcd4042de499d14e55001ccbb24a551f3b954096 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
      );
    });
  });
  describe('setPrices', function () {
    it('default admin can set the prices for all cats and gems', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      expect(
        await PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.ok;
    });
    it('an individual catalyst price can be updated', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      expect(
        await PolygonStarterPackAsAdmin.setPrices(
          [1],
          ['10000000000000000000'],
          [],
          []
        )
      ).to.be.ok;
    });
    it('an individual gem price can be updated', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      expect(
        await PolygonStarterPackAsAdmin.setPrices(
          [],
          [],
          [1],
          ['10000000000000000000']
        )
      ).to.be.ok;
    });
    it('if not default admin cannot set prices', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.revertedWith(
        'AccessControl: account 0xbcd4042de499d14e55001ccbb24a551f3b954096 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
      );
    });
    it('cannot set prices for cat that does not exist', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          badCatIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.revertedWith('INVALID_CAT_ID');
    });
    it('cannot set prices for gem that does not exist', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          badGemIds,
          gemPrices
        )
      ).to.be.revertedWith('INVALID_GEM_ID');
    });
    it('cannot set prices for cat 0', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          zeroCatId,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.revertedWith('INVALID_CAT_ID');
    });
    it('cannot set prices for gem id 0', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          zeroGemId,
          gemPrices
        )
      ).to.be.revertedWith('INVALID_GEM_ID');
    });
    it('SetPrices event is emitted when prices are updated', async function () {
      const {
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();

      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'SetPrices'
      );
      const catalystIdsUpdated = event.args[0];
      const newCatPrices = event.args[1];
      const gemIdsUpdated = event.args[2];
      const newGemPrices = event.args[3];
      const priceChangeTimestamp = event.args[4];

      expect(catalystIdsUpdated[0]).to.be.eq(BigNumber.from(1));
      expect(catalystIdsUpdated[1]).to.be.eq(BigNumber.from(2));
      expect(catalystIdsUpdated[2]).to.be.eq(BigNumber.from(3));
      expect(catalystIdsUpdated[3]).to.be.eq(BigNumber.from(4));

      expect(newCatPrices[0]).to.be.eq(catPrices[0]);
      expect(newCatPrices[1]).to.be.eq(catPrices[1]);
      expect(newCatPrices[2]).to.be.eq(catPrices[2]);
      expect(newCatPrices[3]).to.be.eq(catPrices[3]);

      expect(gemIdsUpdated[0]).to.be.eq(BigNumber.from(1));
      expect(gemIdsUpdated[1]).to.be.eq(BigNumber.from(2));
      expect(gemIdsUpdated[2]).to.be.eq(BigNumber.from(3));
      expect(gemIdsUpdated[3]).to.be.eq(BigNumber.from(4));
      expect(gemIdsUpdated[4]).to.be.eq(BigNumber.from(5));

      expect(newGemPrices[0]).to.be.eq(gemPrices[0]);
      expect(newGemPrices[1]).to.be.eq(gemPrices[1]);
      expect(newGemPrices[2]).to.be.eq(gemPrices[2]);
      expect(newGemPrices[3]).to.be.eq(gemPrices[3]);
      expect(newGemPrices[4]).to.be.eq(gemPrices[4]);

      const block = await ethers.provider.getBlock(receipt.blockHash);
      expect(priceChangeTimestamp).to.be.eq(block.timestamp);
    });
    it('SetPrices event is emitted when a single price is updated', async function () {
      const {
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();

      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.setPrices(
          [],
          [],
          [1],
          ['10000000000000000000']
        )
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'SetPrices'
      );
      const catalystIdsUpdated = event.args[0];
      const newCatPrices = event.args[1];
      const gemIdsUpdated = event.args[2];
      const newGemPrices = event.args[3];
      const priceChangeTimestamp = event.args[4];

      expect(catalystIdsUpdated.length).to.be.equal(0);
      expect(newCatPrices.length).to.be.equal(0);
      expect(gemIdsUpdated.length).to.be.equal(1);
      expect(newGemPrices.length).to.be.equal(1);
      expect(gemIdsUpdated[0]).to.be.eq(BigNumber.from(1));
      expect(newGemPrices[0]).to.be.eq(BigNumber.from('10000000000000000000'));

      const block = await ethers.provider.getBlock(receipt.blockHash);
      expect(priceChangeTimestamp).to.be.eq(block.timestamp);
    });
  });
  describe('withdrawAll', function () {
    it('default admin can withdraw remaining cats and gems from contract', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [1, 2, 3, 4],
          [1, 2, 3, 4, 5]
        )
      ).to.be.ok;
    });
    it('default admin receives correct cats and gems balances upon withdrawal', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        powerGem,
        defenseGem,
        speedGem,
        magicGem,
        luckGem,
        commonCatalyst,
        rareCatalyst,
        epicCatalyst,
        legendaryCatalyst,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.withdrawAll(
        other.address,
        [1, 2, 3, 4],
        [1, 2, 3, 4, 5]
      );
      // 100 of each
      expect(await powerGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await defenseGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await speedGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await magicGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await luckGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await commonCatalyst.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await rareCatalyst.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await epicCatalyst.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await legendaryCatalyst.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
    });
    it('if not default admin cannot withdraw any cats and gems from contract', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.withdrawAll(
          other.address,
          [1, 2, 3, 4],
          [1, 2, 3, 4, 5]
        )
      ).to.be.revertedWith(
        'AccessControl: account 0xbcd4042de499d14e55001ccbb24a551f3b954096 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
      );
    });
    it('cannot withdraw cats that do not exist', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [0, 1, 2, 3, 4, 5, 6],
          [3, 4]
        )
      ).to.be.revertedWith('INVALID_CATALYST_ID');
    });
    it('cannot withdraw gems that do not exist', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [1, 2, 3],
          [3, 4, 5, 8]
        )
      ).to.be.revertedWith('INVALID_GEM_ID');
    });
    it('cannot withdraw cats and gems if contract holds none', async function () {
      const {other} = await setupPolygonStarterPack();
      // TODO: purchase first then withdraw
    });
    it('withdrawal does not fail for zero balances if id exists', async function () {
      const {other} = await setupPolygonStarterPack();
      // TODO: purchase first then withdraw
    });
  });
  describe('purchaseWithSAND', function () {
    it('can purchase bundle of cats and gems when SAND is enabled - zero prices', async function () {
      const {
        other,
        PolygonStarterPackAsAdmin,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, other.address);
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          other.address,
          Message,
          signature
        )
      ).to.be.ok;
    });
    it('can purchase bundle of cats and gems when SAND is enabled and prices are >0 with correct SAND amount', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        sandContract,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      const balance = await sandContract.balanceOf(buyer.address);
      const totalSpend = calculateSpend();
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.ok;
      const totalPriceToPay = await PolygonStarterPack.callStatic.calculateTotalPriceInSAND(
        Message.catalystIds,
        Message.catalystQuantities,
        Message.gemIds,
        Message.gemQuantities
      );
      expect(totalSpend).to.eq(totalPriceToPay);
      expect(await sandContract.balanceOf(buyer.address)).to.eq(
        balance.sub(totalSpend)
      );
    });
    it('cannot purchase bundle of cats and gems when SAND is not enabled', async function () {
      const {other} = await setupPolygonStarterPack();
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, other.address);
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          other.address,
          Message,
          signature
        )
      ).to.be.revertedWith('SAND_IS_NOT_ENABLED');
    });
    it('a successful purchase results in a Purchase event', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      const receipt = await waitFor(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'Purchase'
      );
      // TODO: args
    });
    it('cannot purchase bundle of cats and gems without enough SAND', async function () {
      const {
        other,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, other.address);
      // approve SAND
      await other.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          other.address,
          Message,
          signature
        )
      ).to.be.revertedWith('INSUFFICIENT_FUNDS');
    });
    it('cannot purchase bundle of cats and gems if have not approved the StarterPack contract', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.revertedWith('NOT_AUTHORIZED_ALLOWANCE');
    });
    it('cannot purchase bundle of cats and gems if StarterPack contract does not have any', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      // remove cats & gems so contract is empty
      await PolygonStarterPackAsAdmin.withdrawAll(
        other.address,
        [1, 2, 3, 4],
        [1, 2, 3, 4, 5]
      ); // empty the contract
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.revertedWith('INSUFFICIENT_FUNDS'); // ERC20BaseTokenUpgradeable error message in Catalyst and Gem contracts
    });
    it('purchase fails with incorrect backend signature param', async function () {
      const {
        other,
        PolygonStarterPackAsAdmin,
        buyer,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, other.address); // incorrect buyer address
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_PURCHASE');
    });
    it('purchase fails with bad message params - catalyst lengths', async function () {
      const {
        PolygonStarterPackAsAdmin,
        buyer,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {
        catalystIds,
        catalystQuantities: [1], // bad param
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_CAT_INPUT');
    });
    it('purchase fails with bad message params - gem lengths', async function () {
      const {
        PolygonStarterPackAsAdmin,
        buyer,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2], // bad param
        nonce: 0,
      };
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_GEM_INPUT');
    });
    it('purchase invalidates the nonce after 1 use', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.ok;
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_NONCE');
    });
    it('cannot purchase cats that do not exist', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {
        catalystIds: badCatIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_CATALYST_ID');
    });
    it('cannot purchase gems that do not exist', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds: badGemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          buyer.address,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_GEM_ID');
    });
    it('cannot purchase if not msgSender()', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      const signature = signPurchaseMessage(privateKey, Message, buyer.address);
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          other.address, // bad param
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_SENDER');
    });
    it('purchase occurs with old prices if price change has not yet taken effect', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      // TODO:
    });
    it('purchase fails with updated prices after price change delay', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      // TODO:
    });
  });
  describe('getPrices', function () {
    it('cats and gems prices are initially 0 (with 0 switchTime)', async function () {
      const {PolygonStarterPack} = await setupPolygonStarterPack();
      const prices = await PolygonStarterPack.getPrices(catalystIds, gemIds);
      // TODO: args
      // catalystPricesBeforeSwitch,
      // catalystPricesAfterSwitch,
      // gemPricesBeforeSwitch,
      // gemPricesAfterSwitch,
      // switchTime
      // TODO: view prices after calling setPrices
      // [
      //   [
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true }
      //   ],
      //   [
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true }
      //   ],
      //   [
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true }
      //   ],
      //   [
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true },
      //     BigNumber { _hex: '0x00', _isBigNumber: true }
      //   ],
      //   BigNumber { _hex: '0x00', _isBigNumber: true }
      // ]
    });
    it('cats and gems prices can be viewed after an update has been made', async function () {
      const {PolygonStarterPack} = await setupPolygonStarterPack();
      const prices = await PolygonStarterPack.getPrices(catalystIds, gemIds);
      // TODO: args
      // catalystPricesBeforeSwitch,
      // catalystPricesAfterSwitch,
      // gemPricesBeforeSwitch,
      // gemPricesAfterSwitch,
      // switchTime
      // TODO: view prices after calling setPrices
    });
  });
  describe('isSANDEnabled', function () {
    it('can view whether SAND is enabled or not', async function () {
      const {PolygonStarterPack} = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.isSANDEnabled()).to.be.false;
    });
  });
  describe('metatransactions', function () {
    // TODO:
  });
});
