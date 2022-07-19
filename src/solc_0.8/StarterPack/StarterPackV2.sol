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

    uint256[] private _catalystPrices; // TODO: change to mapping (id --> price) or struct
    uint256[] private _previousCatalystPrices; // TODO: change to mapping (id --> price) or struct
    uint256[] private _gemPrices; // TODO: change to mapping (id --> price) or struct
    uint256[] private _previousGemPrices; // TODO: change to mapping (id --> price) or struct

    // The timestamp of the last pricechange
    uint256 private _priceChangeTimestamp;

    address payable internal _wallet;

    // The delay between calling setPrices() and when the new prices come into effect.
    // Minimizes the effect of price changes on pending TXs
    uint256 private constant PRICE_CHANGE_DELAY = 1 hours;

    event Purchase(address indexed buyer, Message message, uint256 price, address token, uint256 amountPaid);

    event SetPrices(uint256[] catalystPrices, uint256[] gemPrices); // TODO: update using mapping to get prices by ids

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
        GemsCatalystsRegistry registry,
        address initialSigningWallet,
        uint256[] memory initialCatalystPrices,
        uint256[] memory initialGemPrices
    ) PurchaseValidator(initialSigningWallet) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _sand = IERC20(sandContractAddress);
        __ERC2771Handler_initialize(trustedForwarder);
        _wallet = initialWalletAddress;
        _registry = registry;
        _catalystPrices = initialCatalystPrices;
        _previousCatalystPrices = initialCatalystPrices;
        _gemPrices = initialGemPrices;
        _previousGemPrices = initialGemPrices;
        _sandEnabled = true;
    }

    /// @notice Set the wallet receiving the proceeds
    /// @param newWallet Address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newWallet != address(0), "WALLET_ZERO_ADDRESS");
        _wallet = newWallet;
    }

    /// @dev Enable / disable the specific SAND payment for StarterPacks
    /// @param enabled Whether to enable or disable
    function setSANDEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _sandEnabled = enabled;
    }

    /// @notice Return whether SAND payments are enabled
    /// @return Whether SAND payments are enabled
    function isSANDEnabled() external view returns (bool) {
        return _sandEnabled;
    }

    // TODO: check non-reentrant
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
        require(buyer != address(0), "DESTINATION_ZERO_ADDRESS"); // Not needed ??
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

    function _transferCatalysts(
        uint256[] memory catalystIds,
        uint256[] memory catalystQuantities,
        address buyer
    ) internal {
        for (uint256 i = 0; i < catalystIds.length; i++) {
            require(_registry.doesCatalystExist(uint16(catalystIds[i])), "INVALID_ID");
            _registry.getCatalyst(uint16(catalystIds[i])).transferFrom(address(this), buyer, catalystQuantities[i]);
        }
    }

    function _transferGems(
        uint256[] memory gemIds,
        uint256[] memory gemQuantities,
        address buyer
    ) internal {
        for (uint256 i = 0; i < gemIds.length; i++) {
            require(_registry.doesGemExist(uint16(gemIds[i])), "INVALID_ID");
            _registry.getGem(uint16(gemIds[i])).transferFrom(address(this), buyer, gemQuantities[i]);
        }
    }

    /// @notice Enables admin to withdraw all remaining tokens
    /// @param to The destination address for the purchased Catalysts and Gems
    /// @param catalystIds The IDs of the catalysts to be transferred
    /// @param gemIds The IDs of the gems to be transferred
    function withdrawAll(
        address to,
        uint256[] calldata catalystIds,
        uint256[] calldata gemIds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address[] memory catalystAddresses = new address[](catalystIds.length);
        // TODO: remake using gemsCatalystsRegistry (& flag for withdrawn ?)
        // for (uint256 i = 0; i < catalystIds.length; i++) {
        //     catalystAddresses[i] = address(this);
        // }
        // address[] memory gemAddresses = new address[](gemIds.length);
        // for (uint256 i = 0; i < gemIds.length; i++) {
        //     gemAddresses[i] = address(this);
        // }
        // uint256[] memory unsoldCatalystQuantities = _erc20GroupCatalyst.balanceOfBatch(catalystAddresses, catalystIds);
        // uint256[] memory unsoldGemQuantities = _erc20GroupGem.balanceOfBatch(gemAddresses, gemIds);

        // _erc20GroupCatalyst.batchTransferFrom(address(this), to, catalystIds, unsoldCatalystQuantities);
        // _erc20GroupGem.batchTransferFrom(address(this), to, gemIds, unsoldGemQuantities);
    }

    // TODO: update to set prices by id
    /// @notice Enables admin to change the prices of the StarterPack bundles
    /// @param catalystPrices Array of new catalyst prices that will take effect after a delay period
    /// @param gemPrices Array of new gems prices that will take effect after a delay period
    function setPrices(uint256[] calldata catalystPrices, uint256[] calldata gemPrices)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _previousCatalystPrices = _catalystPrices;
        _catalystPrices = catalystPrices;
        _previousGemPrices = _gemPrices;
        _gemPrices = gemPrices;
        _priceChangeTimestamp = block.timestamp;
        emit SetPrices(catalystPrices, gemPrices);
    }

    // TODO: update to use mapping or struct
    /// @notice Get current StarterPack prices
    /// @return catalystPricesBeforeSwitch Array of prices before price change
    /// @return catalystPricesAfterSwitch Array of prices after price change
    /// @return gemPricesBeforeSwitch Gem price before price change
    /// @return gemPricesAfterSwitch Gem price after price change
    /// @return switchTime The time the latest price change will take effect, being the time of the price change plus the price change delay
    function getPrices()
        external
        view
        returns (
            uint256[] memory catalystPricesBeforeSwitch,
            uint256[] memory catalystPricesAfterSwitch,
            uint256[] memory gemPricesBeforeSwitch,
            uint256[] memory gemPricesAfterSwitch,
            uint256 switchTime
        )
    {
        switchTime = 0;
        if (_priceChangeTimestamp != 0) {
            switchTime = _priceChangeTimestamp + PRICE_CHANGE_DELAY;
        }
        return (_previousCatalystPrices, _catalystPrices, _previousGemPrices, _gemPrices, switchTime);
    }

    /// @dev Function to calculate the total price in SAND of the StarterPacks to be purchased
    /// @dev The price of each StarterPack relates to the catalystId
    /// @param catalystIds Array of catalystIds to be purchase
    /// @param catalystQuantities Array of quantities of those catalystIds to be purchased
    /// @return Total price in SAND
    function _calculateTotalPriceInSand(
        uint256[] memory catalystIds,
        uint256[] memory catalystQuantities,
        uint256[] memory gemIds,
        uint256[] memory gemQuantities
    ) internal returns (uint256) {
        require(catalystIds.length == catalystQuantities.length, "INVALID_CAT_INPUT");
        require(gemIds.length == gemQuantities.length, "INVALID_GEM_INPUT");
        (uint256[] memory catalystPrices, uint256[] memory gemPrices) = _priceSelector();
        uint256 totalPrice;
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint256 id = catalystIds[i];
            uint256 quantity = catalystQuantities[i];
            totalPrice = totalPrice + (catalystPrices[id] * (quantity)); // TODO: check correct prices using mapping or struct
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint256 id = gemIds[i];
            uint256 quantity = gemQuantities[i];
            totalPrice = totalPrice + (gemPrices[id] * (quantity)); // TODO: check correct prices using mapping or struct
        }
        return totalPrice;
    }

    /// @dev Function to determine whether to use old or new prices
    /// @return Array of prices
    function _priceSelector() internal returns (uint256[] memory, uint256[] memory) {
        uint256[] memory catalystPrices;
        uint256[] memory gemPrices;
        // No price change:
        if (_priceChangeTimestamp == 0) {
            catalystPrices = _catalystPrices;
            gemPrices = _gemPrices;
        } else {
            // Price change delay has expired.
            if (block.timestamp > _priceChangeTimestamp + PRICE_CHANGE_DELAY) {
                _priceChangeTimestamp = 0;
                catalystPrices = _catalystPrices;
                gemPrices = _gemPrices;
            } else {
                // Price change has occured:
                catalystPrices = _previousCatalystPrices;
                gemPrices = _previousGemPrices;
            }
        }
        return (catalystPrices, gemPrices);
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
