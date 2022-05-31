//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/utils/Address.sol";
import "../../../asset/ERC1155ERC721.sol";
import "../../../common/interfaces/IAssetAttributesRegistry.sol";
import "../../../common/BaseWithStorage/WithRoyalties.sol";
import "../../../asset/libraries/AssetHelper.sol";

contract PolygonAssetV2 is ERC1155ERC721, WithRoyalties {
    address private _childChainManager;
    AssetHelper.AssetRegistryData private assetRegistryData;

    event ChainExit(address indexed to, uint256[] tokenIds, uint256[] amounts, bytes data);

    /// @notice fulfills the purpose of a constructor in upgradeabale contracts
    function initialize(
        address trustedForwarder,
        address admin,
        address bouncerAdmin,
        address childChainManager,
        uint8 chainIndex,
        address assetRegistry
    ) external {
        initV2(trustedForwarder, admin, bouncerAdmin, address(0), chainIndex);
        _childChainManager = childChainManager;
        assetRegistryData.assetRegistry = IAssetAttributesRegistry(assetRegistry);
    }

    /// @notice called when tokens are deposited on root chain
    /// @dev Should be callable only by ChildChainManager
    /// @dev Should handle deposit by minting the required tokens for user
    /// @dev Make sure minting is done only by this function
    /// @param user user address for whom deposit is being done
    /// @param depositData abi encoded ids array and amounts array
    function deposit(address user, bytes calldata depositData) external {
        require(_msgSender() == _childChainManager, "!DEPOSITOR");
        require(user != address(0), "INVALID_DEPOSIT_USER");
        (uint256[] memory ids, uint256[] memory amounts, bytes32[] memory hashes) =
            AssetHelper.decodeAndSetCatalystDataL1toL2(assetRegistryData, depositData);

        for (uint256 i = 0; i < ids.length; i++) {
            _metadataHash[ids[i] & ERC1155ERC721Helper.URI_ID] = hashes[i];
            _rarityPacks[ids[i] & ERC1155ERC721Helper.URI_ID] = "0x00";
            if ((ids[i] & ERC1155ERC721Helper.IS_NFT) > 0) {
                _mintNFTFromAnotherLayer(user, ids[i]);
            } else {
                _mintFTFromAnotherLayer(amounts[i], user, ids[i]);
            }
        }
        _completeMultiMint(_msgSender(), user, ids, amounts, depositData);
    }

    /// @notice called when user wants to withdraw tokens back to root chain
    /// @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
    /// @param ids ids to withdraw
    /// @param amounts amounts to withdraw
    function withdraw(uint256[] calldata ids, uint256[] calldata amounts) external {
        bytes32[] memory hashes = new bytes32[](ids.length);
        IAssetAttributesRegistry.AssetGemsCatalystData[] memory gemsCatalystDatas =
            AssetHelper.getGemsAndCatalystData(assetRegistryData, ids);

        for (uint256 i = 0; i < ids.length; i++) {
            hashes[i] = _metadataHash[ids[i] & ERC1155ERC721Helper.URI_ID];
        }

        if (ids.length == 1) {
            _burn(_msgSender(), ids[0], amounts[0]);
        } else {
            _burnBatch(_msgSender(), ids, amounts);
        }
        emit ChainExit(_msgSender(), ids, amounts, abi.encode(hashes, gemsCatalystDatas));
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 id) external pure override returns (bool) {
        return
            id == 0x01ffc9a7 || //ERC165
            id == 0xd9b67a26 || // ERC1155
            id == 0x80ac58cd || // ERC721
            id == 0x5b5e139f || // ERC721 metadata
            id == 0x0e89341c || // ERC1155 metadata
            id == 0x2a55205a; // ERC2981
    }
}
