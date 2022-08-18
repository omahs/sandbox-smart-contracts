// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {TileOrLandLib} from "../../../common/Libraries/TileOrLandLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {IExperienceToken} from "../../../common/interfaces/IExperienceToken.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @notice Contract managing Experiences and Estates linking, creating a relationship
/// @notice between an experience and one or more lands.
contract ExperienceEstateRegistry is
    Initializable,
    ContextUpgradeable,
    AccessControlUpgradeable,
    IEstateExperienceRegistry
{
    using MapLib for MapLib.Map;
    using TileOrLandLib for TileOrLandLib.TileOrLand;

    struct RelinkData {
        uint256 estateId;
        uint256 expId;
        uint256 x;
        uint256 y;
    }

    struct EstateAndLands {
        // 0 means not found, 1 means single land,  >1 means multiLand with the value estateId - 1,
        uint256 estateId;
        uint256 singleLand;
        MapLib.Map multiLand;
    }

    struct RegistryStorage {
        address experienceToken;
        address estateToken;
        address landToken;
        // Experience Id => EstateAndLands
        mapping(uint256 => EstateAndLands) links;
        MapLib.Map linkedLands;
    }

    /// @dev Emitted when a link is created
    /// @param estateId Id of the erc721 ESTATE token containing the lands that were linked.
    /// @param expId The experience id that is now linked to the lands.
    /// @param x x coordinate of the linked lands
    /// @param y y coordinate of the linked lands
    /// @param expTemplate template of the exp being linked
    /// @param user user creating the link
    event LinkCreated(
        uint256 estateId,
        uint256 expId,
        uint256 x,
        uint256 y,
        TileOrLandLib.TileOrLand expTemplate,
        address user
    );

    /// @dev Emitted when a link is deleted
    /// @param expId id of the experience that was unkinked
    /// @param user from which the link is deleated
    event LinkDeleted(uint256 expId, address user);

    function ExperienceEstateRegistry_init(
        //address trustedForwarder,
        address estateToken_,
        address experienceToken_,
        //uint8 chainIndex,
        address landToken_,
        address admin
    ) external initializer {
        _s().experienceToken = experienceToken_;
        _s().estateToken = estateToken_;
        _s().landToken = landToken_;
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice return the amount of tiles that describe the land map inside a given estate
    /// @param expId the experience id
    /// @return the length of the tile map
    function getNumberTiles(uint256 expId) external view returns (uint256) {
        uint256 expStorageId = IExperienceToken(_s().experienceToken).getStorageId(expId);
        return _s().links[expStorageId].multiLand.length();
    }

    /// @notice return the amount of lands inked to an experience
    /// @param expId the experience id
    /// @return the amount of lands linked to the experience
    function getLandCount(uint256 expId) external view returns (uint256) {
        uint256 expStorageId = IExperienceToken(_s().experienceToken).getStorageId(expId);
        return _s().links[expStorageId].multiLand.getLandCount();
    }

    /// @notice return the estate id linked to an experience
    /// @param expId the experience id
    /// @return the estate id linked to the experice from the given id
    function getEstateId(uint256 expId) external view returns (uint256) {
        uint256 expStorageId = IExperienceToken(_s().experienceToken).getStorageId(expId);
        return _s().links[expStorageId].estateId;
    }

    /// @notice creation of a link between a single land and an experience
    /// @param expId the experience id
    /// @param x coordinate of the template
    /// @param y coordinate of the template
    function linkSingle(
        uint256 expId,
        uint256 x,
        uint256 y
    ) external {
        _link(0, expId, x, y);
    }

    /// @notice creation of a link between an estate and an experience
    /// @param estateId the estate id
    /// @param expId the experience id
    /// @param x coordinate of the template
    /// @param y coordinate of the template
    function link(
        uint256 estateId,
        uint256 expId,
        uint256 x,
        uint256 y
    ) external override {
        _link(estateId, expId, x, y);
    }

    /// @notice unlink an experience from either land or estate
    /// @param expId the experience id to be unlinked
    function unLink(uint256 expId) external override {
        _unLinkFrom(_msgSender(), expId);
    }

    /// @notice relink an experience, ereasing the previous link and creating a new one
    /// @param expIdsToUnlink array of experience ids to unlink
    /// @param expToLink RelinkData, cointaining
    /// estateId: estate id to be linked
    /// expId: exp id to be linked
    /// x: template x coord
    /// y: template y
    function reLink(uint256[] calldata expIdsToUnlink, RelinkData[] memory expToLink) external {
        _batchUnLinkFrom(_msgSender(), expIdsToUnlink);
        uint256 len = expToLink.length;
        for (uint256 i; i < len; i++) {
            RelinkData memory d = expToLink[i];
            _link(d.estateId, d.expId, d.x, d.y);
        }
    }

    /// @notice unlink links in batch, can only be callied through the Estate contract
    /// @param from owner of the links
    /// @param expIdsToUnlink array of ids to be unlinked
    function batchUnLinkFrom(address from, uint256[] calldata expIdsToUnlink) external override {
        require(address(_s().estateToken) == _msgSender(), "can only be called by estate");
        _batchUnLinkFrom(from, expIdsToUnlink);
    }

    /// @notice check if quads are linked
    /// @param quads set of quads to verify if they are linked
    function isLinked(uint256[][3] calldata quads) external view override returns (bool) {
        uint256 len = quads[0].length;
        for (uint256 i; i < len; i++) {
            if (_s().linkedLands.intersect(quads[1][i], quads[2][i], quads[0][i])) {
                return true;
            }
        }
        return false;
    }

    /// @notice check if quads are linked
    /// @param expId experience id to verify if it is linked
    function isLinked(uint256 expId) external view override returns (bool) {
        uint256 expStorageId = IExperienceToken(_s().experienceToken).getStorageId(expId);
        EstateAndLands storage est = _s().links[expStorageId];
        return est.estateId > 0;
    }

    /// @notice check if quads are linked
    /// @param tiles tile with coordinate, to verify if is linked
    function isLinked(TileWithCoordLib.TileWithCoord[] calldata tiles) external view override returns (bool) {
        return _s().linkedLands.intersect(tiles);
    }

    /// @notice update the address of the land token
    /// @param newLandToken new land token address
    function setLandContract(address newLandToken) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "NOT_AUTHORIZED");
        _s().landToken = newLandToken;
    }

    /// @notice update the address of the estate token
    /// @param newEstateToken new estate token address
    function setEstateContract(address newEstateToken) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "NOT_AUTHORIZED");
        _s().estateToken = newEstateToken;
    }

    /// @notice update the address of the experience token
    /// @param newExperienceToken new land token address
    function setExperienceContract(address newExperienceToken) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "NOT_AUTHORIZED");
        _s().experienceToken = newExperienceToken;
    }

    function _link(
        uint256 estateId,
        uint256 expId,
        uint256 x,
        uint256 y
    ) internal {
        uint256 expStorageId = IExperienceToken(_s().experienceToken).getStorageId(expId);
        TileOrLandLib.TileOrLand memory template = IExperienceToken(_s().experienceToken).getTemplate(expStorageId);
        require(!template.isEmpty(), "empty template");
        EstateAndLands storage est = _s().links[expStorageId];
        require(est.estateId == 0, "Exp already in use");

        if (estateId == 0) {
            require(template.isOneLand(), "must be done inside estate");
            uint256 translatedX = template.getX() + x;
            uint256 translatedY = template.getY() + y;
            uint256 translatedId = translatedX + (translatedY * 408);
            require(IERC721(_s().landToken).ownerOf(translatedId) == _msgSender(), "invalid user");
            require(!_s().linkedLands.contain(translatedX, translatedY), "already linked");
            _s().linkedLands.set(translatedX, translatedY, 1);
            est.singleLand = translatedId;
        } else {
            require(IEstateToken(_s().estateToken).getOwnerOfStorage(estateId) == _msgSender(), "invalid user");
            MapLib.TranslateResult memory s = MapLib.translate(template.getTile(), x, y);
            require(!_s().linkedLands.intersect(s), "already linked");
            _s().linkedLands.set(s);
            require(IEstateToken(_s().estateToken).contain(estateId, s), "not enough land");
            est.multiLand.set(s);
        }
        // we add one so: 0 means not found, 1 means single land,  >1 means multiLand with the value estateId - 1,
        est.estateId = estateId + 1;
        emit LinkCreated(estateId, expId, x, y, template, _msgSender());
    }

    function _batchUnLinkFrom(address from, uint256[] calldata expIdsToUnlink) internal {
        uint256 len = expIdsToUnlink.length;
        for (uint256 i; i < len; i++) {
            _unLinkFrom(from, expIdsToUnlink[i]);
        }
    }

    function _unLinkFrom(address from, uint256 expId) internal {
        uint256 expStorageId = IExperienceToken(_s().experienceToken).getStorageId(expId);
        EstateAndLands storage est = _s().links[expStorageId];
        require(est.estateId > 0, "unknown experience");
        if (est.estateId == 1) {
            uint256 landId = est.singleLand;
            require(IERC721(_s().landToken).ownerOf(landId) == from, "invalid user");
            uint256 x = landId % 408;
            uint256 y = landId / 408;
            _s().linkedLands.clear(x, y, 1);
        } else {
            require(IEstateToken(_s().estateToken).getOwnerOfStorage(est.estateId - 1) == from, "invalid user");
            _s().linkedLands.clear(est.multiLand);
        }
        delete _s().links[expStorageId];
        emit LinkDeleted(expId, from);
    }

    function _s() internal pure returns (RegistryStorage storage ds) {
        bytes32 storagePosition = keccak256("ExperienceEstateRegistry.RegistryStorage");
        assembly {
            ds.slot := storagePosition
        }
    }

    uint256[50] private __gap;
}
