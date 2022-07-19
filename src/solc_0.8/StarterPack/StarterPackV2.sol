pragma solidity 0.8.2;

import "./PurchaseValidator.sol";
import "../catalyst/GemsCatalystsRegistry.sol";
import "../common/BaseWithStorage/ERC2771Handler.sol";
import "../common/Libraries/SafeMathWithRequire.sol"; // TODO: check

/// @title StarterPack contract that supports SAND as payment
/// @notice This contract manages the purchase and distribution of StarterPacks (bundles of Catalysts and Gems)
contract StarterPackV2 is PurchaseValidator, ERC2771Handler {
    using SafeMathWithRequire for uint256;
    uint256 private constant DECIMAL_PLACES = 1 ether;

    // TODO: ordering

    IERC20 internal immutable _sand;
    GemsCatalystsRegistry internal immutable _registry;

    bool public _sandEnabled;

    // Mapping catalyst and gem ids to their prices
    mapping(uint16 => uint256) private _catalystPrices;
    mapping(uint16 => uint256) private _catalystPreviousPrices;
    mapping(uint16 => uint256) private _gemPrices;
    mapping(uint16 => uint256) private _gemPreviousPrices;

    // The timestamp of the last pricechange
    uint256 private _priceChangeTimestamp;

    address payable internal _wallet;

    // The delay between calling setPrices() and when the new prices come into effect
    // Minimizes the effect of price changes on pending TXs
    uint256 private constant PRICE_CHANGE_DELAY = 1 hours;

    event Wallet(address newWallet);

    event Purchase(address indexed buyer, Message message, uint256 price, address token, uint256 amountPaid);

    event SetPrices(
        uint256[] catalystIds,
        uint256[] catalystPrices,
        uint256[] gemIds,
        uint256[] gemPrices,
        uint256 priceChangeTimestamp
    );

    struct Message {
        uint256[] catalystIds;
        uint256[] catalystQuantities;
        uint256[] gemIds;
        uint256[] gemQuantities;
        uint256 nonce;
    }

    constructor(
        address admin,
        address sandContractAddress,
        address trustedForwarder,
        address payable initialWalletAddress,
        address initialSigningWallet,
        GemsCatalystsRegistry registry
    ) PurchaseValidator(initialSigningWallet) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _sand = IERC20(sandContractAddress);
        __ERC2771Handler_initialize(trustedForwarder);
        _wallet = initialWalletAddress;
        _registry = registry;
    }

    /// @notice Set the wallet receiving the proceeds
    /// @param newWallet Address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newWallet != address(0), "WALLET_ZERO_ADDRESS");
        _wallet = newWallet;
        emit Wallet(newWallet);
    }

    /// @notice Enables admin to change the prices (in SAND) of the catalysts and gems in the StarterPack bundle
    /// @param catalystPrices Array of new catalyst prices that will take effect after a delay period
    /// @param gemPrices Array of new gems prices that will take effect after a delay period
    function setPrices(
        uint256[] calldata catalystIds,
        uint256[] calldata catalystPrices,
        uint256[] calldata gemIds,
        uint256[] calldata gemPrices
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(catalystIds.length == catalystPrices.length, "INVALID_CAT_INPUT");
        require(gemIds.length == gemPrices.length, "INVALID_GEM_INPUT");
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = uint16(catalystIds[i]);
            require(_registry.doesCatalystExist(id), "INVALID_CAT_ID");
            _catalystPreviousPrices[id] = _catalystPrices[id]; // TODO: make sure there is no scenario where previous and current are different lengths / IDs
            _catalystPrices[id] = catalystPrices[i];
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = uint16(gemIds[i]);
            require(_registry.doesGemExist(id), "INVALID_GEM_ID");
            _gemPreviousPrices[id] = _gemPrices[id]; // TODO: make sure there is no scenario where previous and current are different lengths / IDs
            _gemPrices[id] = gemPrices[i];
        }
        _priceChangeTimestamp = block.timestamp;
        emit SetPrices(catalystIds, catalystPrices, gemIds, gemPrices, _priceChangeTimestamp);
    }

    /// @notice Enables admin to withdraw any remaining tokens
    /// @param to The destination address for the purchased Catalysts and Gems
    /// @param catalystIds The IDs of the catalysts to be transferred
    /// @param gemIds The IDs of the gems to be transferred
    function withdrawAll(
        address to,
        uint256[] calldata catalystIds,
        uint256[] calldata gemIds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = uint16(catalystIds[i]);
            require(_registry.doesCatalystExist(id), "INVALID_CAT_ID");
            _executeRegistryTransferCatalyst(id, address(this), to, _registry.getCatalyst(id).balanceOf(address(this)));
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = uint16(gemIds[i]);
            require(_registry.doesGemExist(id), "INVALID_GEM_ID");
            _registry.getGem(id).transferFrom(address(this), to, _registry.getGem(id).balanceOf(address(this)));
        }
    }

    /// @dev Enable / disable the specific SAND payment for StarterPacks
    /// @param enabled Whether to enable or disable
    function setSANDEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _sandEnabled = enabled;
    }

    // TODO: test for reentrancy
    /// @notice Purchase StarterPacks with SAND
    /// @param buyer The destination address for the purchased Catalysts and Gems and the address that will pay for the purchase; if not metaTx then buyer must be equal to msg.sender
    /// @param message A message containing information about the Catalysts and Gems to be purchased
    /// @param signature A signed message specifying tx details
    function purchaseWithSand(
        address buyer,
        Message calldata message,
        bytes calldata signature
    ) external {
        require(buyer == _msgSender(), "INVALID_SENDER");
        require(_sandEnabled, "SAND_IS_NOT_ENABLED");
        // TODO: check against AssetSignedAuction audit feedback on signatures
        require(
            isPurchaseValid(
                buyer,
                message.catalystIds,
                message.catalystQuantities,
                message.gemIds,
                message.gemQuantities,
                message.nonce,
                signature
            ),
            "INVALID_PURCHASE"
        );

        uint256 amountInSand =
            _calculateTotalPriceInSand(
                message.catalystIds,
                message.catalystQuantities,
                message.gemIds,
                message.gemQuantities
            );
        _handlePurchaseWithSand(buyer, _wallet, address(_sand), amountInSand);
        _transferCatalysts(message.catalystIds, message.catalystQuantities, buyer);
        _transferGems(message.gemIds, message.gemQuantities, buyer);
        emit Purchase(buyer, message, amountInSand, address(_sand), amountInSand);
    }

    /// @notice Get current StarterPack prices for catalysts and gems by id
    /// @return catalystPricesBeforeSwitch Catalyst prices before price change
    /// @return catalystPricesAfterSwitch Catalyst prices after price change
    /// @return gemPricesBeforeSwitch Gem prices before price change
    /// @return gemPricesAfterSwitch Gem prices after price change
    /// @return switchTime The time the latest price change will take effect, being the time of the price change plus the price change delay
    function getPrices(uint256[] calldata catalystIds, uint256[] calldata gemIds)
        external
        view
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256
        )
    {
        uint256 switchTime = 0;
        if (_priceChangeTimestamp != 0) {
            switchTime = _priceChangeTimestamp + PRICE_CHANGE_DELAY;
        }
        uint256[] memory catalystPricesBeforeSwitch = new uint256[](catalystIds.length);
        uint256[] memory catalystPricesAfterSwitch = new uint256[](catalystIds.length);
        uint256[] memory gemPricesBeforeSwitch = new uint256[](gemIds.length);
        uint256[] memory gemPricesAfterSwitch = new uint256[](gemIds.length);
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = uint16(catalystIds[i]);
            catalystPricesBeforeSwitch[i] = _catalystPreviousPrices[id];
            catalystPricesAfterSwitch[i] = _catalystPrices[id];
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = uint16(gemIds[i]);
            gemPricesBeforeSwitch[i] = _gemPreviousPrices[id];
            gemPricesAfterSwitch[i] = _gemPrices[id];
        }
        return (
            catalystPricesBeforeSwitch,
            catalystPricesAfterSwitch,
            gemPricesBeforeSwitch,
            gemPricesAfterSwitch,
            switchTime
        );
    }

    /// @notice Return whether SAND payments are enabled
    /// @return Whether SAND payments are enabled
    function isSANDEnabled() external view returns (bool) {
        return _sandEnabled;
    }

    function _transferCatalysts(
        uint256[] memory catalystIds,
        uint256[] memory catalystQuantities,
        address buyer
    ) internal {
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = uint16(catalystIds[i]);
            require(_registry.doesCatalystExist(id), "INVALID_ID");
            _executeRegistryTransferCatalyst(id, address(this), buyer, catalystQuantities[i]);
        }
    }

    function _executeRegistryTransferCatalyst(
        uint16 catalystId,
        address from,
        address to,
        uint256 quantity
    ) internal {
        _registry.getCatalyst(catalystId).transferFrom(from, to, quantity);
    }

    function _transferGems(
        uint256[] memory gemIds,
        uint256[] memory gemQuantities,
        address buyer
    ) internal {
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = uint16(gemIds[i]);
            require(_registry.doesGemExist(id), "INVALID_ID");
            _executeRegistryTransferGem(id, address(this), buyer, gemQuantities[i]);
        }
    }

    function _executeRegistryTransferGem(
        uint16 gemId,
        address from,
        address to,
        uint256 quantity
    ) internal {
        _registry.getGem(gemId).transferFrom(from, to, quantity);
    }

    /// @dev Function to calculate the total price in SAND of the StarterPacks to be purchased
    function _calculateTotalPriceInSand(
        uint256[] memory catalystIds,
        uint256[] memory catalystQuantities,
        uint256[] memory gemIds,
        uint256[] memory gemQuantities
    ) internal returns (uint256) {
        require(catalystIds.length == catalystQuantities.length, "INVALID_CAT_INPUT");
        require(gemIds.length == gemQuantities.length, "INVALID_GEM_INPUT");
        bool useCurrentPrices = _priceSelector();
        uint256 totalPrice;
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = uint16(catalystIds[i]);
            uint256 quantity = catalystQuantities[i];
            totalPrice =
                totalPrice +
                (useCurrentPrices ? _catalystPrices[id] : _catalystPreviousPrices[id] * (quantity));
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = uint16(gemIds[i]);
            uint256 quantity = gemQuantities[i];
            totalPrice = totalPrice + (useCurrentPrices ? _gemPrices[id] : _gemPreviousPrices[id] * (quantity));
        }
        return totalPrice;
    }

    /// @dev Function to determine whether to use previous or current prices
    function _priceSelector() internal returns (bool) {
        bool useCurrentPrices;
        // No price change
        if (_priceChangeTimestamp == 0) {
            useCurrentPrices = true;
        } else {
            // Price change delay has expired: use current prices
            if (block.timestamp > _priceChangeTimestamp + PRICE_CHANGE_DELAY) {
                _priceChangeTimestamp = 0;
                useCurrentPrices = true;
            } else {
                // Price change has recently occured: use previous prices until price change takes effect
                useCurrentPrices = false;
            }
        }
        return (useCurrentPrices);
    }

    /// @dev Function to handle purchase with SAND
    function _handlePurchaseWithSand(
        address buyer,
        address payable paymentRecipient,
        address tokenAddress,
        uint256 amount
    ) internal {
        IERC20 token = IERC20(tokenAddress);
        uint256 amountForDestination = amount;
        require(token.transferFrom(buyer, paymentRecipient, amountForDestination), "PAYMENT_TRANSFER_FAILED"); // TODO: review
    }

    /// @dev this override is required
    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            // solhint-disable-next-line no-inline-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return msg.sender;
        }
    }

    /// @dev this override is required
    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }
}
