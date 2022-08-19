//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IEstateToken} from "../common/interfaces/IEstateToken.sol";
import {IERC4907} from "../common/interfaces/IERC4907.sol";
import {EstateBaseToken} from "./EstateBaseToken.sol";
import {EstateTokenIdHelperLib} from "./EstateTokenIdHelperLib.sol";

/// @title Base contract for estate contract on L1 and L2, it used to group lands together and implements ERC4907.
abstract contract EstateBaseTokenWithERC4907 is IERC4907, IEstateToken, EstateBaseToken {
    using EstateTokenIdHelperLib for uint256;
    struct UserInfo {
        address user; // address of user role
        uint64 expires; // unix timestamp, user expires
    }

    struct EstateBaseTokenWithERC4907Storage {
        mapping(uint256 => UserInfo) users;
    }

    bytes32 public constant RENTAL_PLATFORM_ROLE = keccak256("RENTAL_PLATFORM_ROLE");

    /// @notice set the user and expires of a NFT
    /// @dev The zero address indicates there is no user
    /// Throws if `tokenId` is not valid NFT
    /// @param user  The new user of the NFT
    /// @param expires  UNIX timestamp, The new user could use the NFT before expires
    function setUser(
        uint256 tokenId,
        address user,
        uint64 expires
    ) external virtual override {
        require(hasRole(RENTAL_PLATFORM_ROLE, _msgSender()), "invalid user");
        UserInfo storage info = _userInfo(tokenId);
        info.user = user;
        info.expires = expires;
        emit UpdateUser(tokenId, user, expires);
    }

    /// @notice Get the user address of an NFT
    /// @dev The zero address indicates that there is no user or the user is expired
    /// @param tokenId The NFT to get the user address for
    /// @return The user address for this NFT
    function userOf(uint256 tokenId) external view virtual override returns (address) {
        if (uint256(_userInfo(tokenId).expires) >= block.timestamp) {
            return _userInfo(tokenId).user;
        }
        return address(0);
    }

    /// @notice Get the user expires of an NFT
    /// @dev The zero value indicates that there is no user
    /// @param tokenId The NFT to get the user expires for
    /// @return The user expires for this NFT
    function userExpires(uint256 tokenId) external view virtual override returns (uint256) {
        return _userInfo(tokenId).expires;
    }

    /// @notice Check if the contract supports an interface.
    /// @param interfaceId The id of the interface.
    /// @return Whether the interface is supported.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC4907).interfaceId || super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);
        if (from != to && _userInfo(tokenId).user != address(0)) {
            delete _s4907().users[tokenId.storageId()];
            emit UpdateUser(tokenId, address(0), 0);
        }
    }

    function _userInfo(uint256 tokenId) internal view returns (UserInfo storage info) {
        return _s4907().users[tokenId.storageId()];
    }

    function _s4907() internal pure returns (EstateBaseTokenWithERC4907Storage storage ds) {
        bytes32 storagePosition = keccak256("EstateBaseTokenWithERC4907.EstateBaseTokenWithERC4907Storage");
        assembly {
            ds.slot := storagePosition
        }
    }

    uint256[50] private __gap;
}
