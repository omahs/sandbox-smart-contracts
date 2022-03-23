//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

// TODO: update: burn etc
// TODO: interface Base Token

interface IAssetERC721Token is IERC721Upgradeable {
    function mint(address to, uint256 id) external;

    function mint(
        address to,
        uint256 id,
        bytes calldata metaData
    ) external;

    function burnFrom(address from, uint256 id) external;

    // function safeTransferFrom(
    //     address from,
    //     address to,
    //     uint256 tokenId
    // ) external;

    function exists(uint256 tokenId) external view returns (bool);
}
