// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


/**
* Interface for royalties following EIP-2981 (https://eips.ethereum.org/EIPS/eip-2981).
*/
interface IERC2981 is IERC165 {
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view returns (
        address receiver,
        uint256 royaltyAmount
    );
}


contract CoralMarketplace is ReentrancyGuard {
	// bytes4(keccak256("royaltyInfo(uint256,uint256)")) == 0x2a55205a
	bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

	using Counters for Counters.Counter;
	Counters.Counter private _itemIds;
	Counters.Counter private _itemsSold;
	address payable owner;
	uint256 private _marketFee;

	struct MarketItem {
		uint256 itemId; // Incremental ID in the market contract
		address nftContract;
		uint256 tokenId; // Incremental ID in the NFT contract
		address payable seller;
		address payable owner;
		address creator;
		uint256 price;
		uint256 marketFee; // Market fee at the moment of creating the item
		bool onSale;
		MarketItemSale[] sales;
	}

	struct MarketItemSale {
		address seller;
		address buyer;
		uint256 price;
	}

	mapping(uint256 => MarketItem) private idToMarketItem;

	event MarketItemForSale (uint256 indexed itemId, address indexed nftContract, uint256 indexed tokenId,
		address seller, address creator, uint256 price, uint256 marketFee);

	event MarketFeeChanged(uint256 prevValue, uint256 newValue);

	event RoyaltiesPaid(uint256 tokenId, uint value);
	

	constructor(uint256 newMarketFee) {
		owner = payable(msg.sender);
		_marketFee = newMarketFee;
	}

	/**
	 * Returns current market fee percentage with two decimal points.
	 * E.g. 250 --> 2.5%
	 */
	function getMarketFee() public view returns (uint256) {
		return _marketFee;
	}

	/**
	 * Sets market fee percentage with two decimal points.
	 * E.g. 250 --> 2.5%
	 */
	function setMarketFee(uint256 newMarketFee) public virtual {
		require(owner == msg.sender, "CoralMarketplace: Caller is not owner of the contract.");
		require(newMarketFee <= 5000, 'CoralMarketplace: Market fee value cannot be higher than 5000.');
        uint256 prevMarketFee = _marketFee;
        _marketFee = newMarketFee;
        emit MarketFeeChanged(prevMarketFee, newMarketFee);
    }


	/**
	 * Puts on sale a new item.
	 */
	function createMarketItem(address nftContract, uint256 tokenId, uint256 price) public nonReentrant {
		require(price > 0, "CoralMarketplace: Price must be greater than 0.");

		// Transfer ownership of the token to this contract
		IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

		// Map new MarketItem
		_itemIds.increment();
		uint256 itemId = _itemIds.current();
		// MarketItemSale[] memory salesEmpty;
		// idToMarketItem[itemId] = MarketItem(itemId, nftContract, tokenId, payable(msg.sender), payable(address(0)),
		// 	msg.sender, price, _marketFee, true, salesEmpty);
		idToMarketItem[itemId].itemId = itemId;
		idToMarketItem[itemId].nftContract = nftContract;
		idToMarketItem[itemId].tokenId = tokenId;
		idToMarketItem[itemId].seller = payable(msg.sender);
		idToMarketItem[itemId].creator = msg.sender;
		idToMarketItem[itemId].price = price;
		idToMarketItem[itemId].marketFee = _marketFee;
		idToMarketItem[itemId].onSale = true;

		emit MarketItemForSale(itemId, nftContract, tokenId, msg.sender, msg.sender, price, _marketFee);
	}


	/**
	 * Put on sale item bought previously.
	 */
	function putMarketItemOnSale(uint256 itemId, uint256 price) public nonReentrant {
		require(idToMarketItem[itemId].itemId > 0, "CoralMarketplace: itemId does not exist. Use createMarketItem function.");
		require(!idToMarketItem[itemId].onSale, "CoralMarketplace: This item is already on sale.");
		require(price > 0, "CoralMarketplace: Price must be greater than 0.");

		// Transfer ownership of the token to this contract
		IERC721(idToMarketItem[itemId].nftContract).transferFrom(msg.sender, address(this), idToMarketItem[itemId].tokenId);

		// Update MarketItem
		idToMarketItem[itemId].seller = payable(msg.sender);
		idToMarketItem[itemId].owner = payable(address(0));
		idToMarketItem[itemId].price = price;
		idToMarketItem[itemId].marketFee = _marketFee;
		idToMarketItem[itemId].onSale = true;

		_itemsSold.decrement();

		emit MarketItemForSale(itemId, idToMarketItem[itemId].nftContract, idToMarketItem[itemId].tokenId, msg.sender, 
			idToMarketItem[itemId].creator, price, _marketFee);
	}


	/**
	 * Creates a new sale for a existing market item.
	 */
	function createMarketSale(address nftContract, uint256 itemId) public payable nonReentrant {
		// Get item price and tokenId from the mapping
		uint256 price = idToMarketItem[itemId].price;
		uint256 tokenId = idToMarketItem[itemId].tokenId;

		require(idToMarketItem[itemId].onSale, "CoralMarketplace: This item is not currently on sale.");
		require(msg.value == price, "CoralMarketplace: Value of transaction must be equal to sale price.");

		// Pay royalties
		uint256 saleValue = msg.value;
		address payable seller = idToMarketItem[itemId].seller;
		if (_checkRoyalties(nftContract)) {
            saleValue = _deduceRoyalties(nftContract, tokenId, saleValue, seller);
        }

		// Pay market fee
		uint256 marketFee = (saleValue * idToMarketItem[itemId].marketFee) / 10000;
		(bool successFee, ) = owner.call{value: marketFee}("");
		require(successFee, "CoralMarketplace: Market fee transfer failed.");
		uint256 netSaleValue = saleValue - marketFee;

		// Transfer value of the transaction to the seller
		(bool successTx, ) = seller.call{value: netSaleValue}("");
		(successTx, "CoralMarketplace: Seller payment transfer failed.");

		// Transfer ownership of the token to buyer
		IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

		// Update item in the mapping
		idToMarketItem[itemId].owner = payable(msg.sender);
		idToMarketItem[itemId].onSale = false;
		idToMarketItem[itemId].sales.push(MarketItemSale(seller, msg.sender, price));

		_itemsSold.increment();
	}


	/**
	 * Returns unsold market items.
	 */
	function fetchMarketItems() public view returns (MarketItem[] memory) {
		// Get total number of unsold items
		uint itemCount = _itemIds.current();
		uint unsoldItemCount = itemCount - _itemsSold.current();
		uint currentIndex = 0;

		// Initialize array
		MarketItem[] memory items = new MarketItem[](unsoldItemCount);

		// Fill array
		for (uint i = 0; i < itemCount; i++) {
			if (idToMarketItem[i + 1].owner == address(0)) {
				uint currentId = idToMarketItem[i + 1].itemId;
				MarketItem storage currentItem = idToMarketItem[currentId];
				items[currentIndex] = currentItem;
				currentIndex += 1;
			}
		}

		return items;
	}


	/**
	 * Returns items owned by caller.
	 */
	function fetchItemsOwned() public view returns (MarketItem[] memory) {
		// Get total number of items owned by calling address
		uint totalItemCount = _itemIds.current();
		uint itemCount = 0;
		uint currentIndex = 0;
		for (uint i = 0; i < totalItemCount; i++) {
			if (idToMarketItem[i + 1].owner == msg.sender) {
				itemCount += 1;
			}
		}

		// Initialize array
		MarketItem[] memory items = new MarketItem[](itemCount);

		// Fill array
		for (uint i = 0; i < totalItemCount; i++) {
			if (idToMarketItem[i + 1].owner == msg.sender) {
				uint currentId = idToMarketItem[i + 1].itemId;
				MarketItem storage currentItem = idToMarketItem[currentId];
				items[currentIndex] = currentItem;
				currentIndex += 1;
			}
		}

		return items;
	}


	/**
	 * Returns items created by caller.
	 */
	function fetchItemsCreated() public view returns (MarketItem[] memory) {
		// Get total number of items created by calling address
		uint totalItemCount = _itemIds.current();
		uint itemCount = 0;
		uint currentIndex = 0;
		for (uint i = 0; i < totalItemCount; i++) {
			if (idToMarketItem[i + 1].creator == msg.sender) {
				itemCount += 1;
			}
		}

		// Initialize array
		MarketItem[] memory items = new MarketItem[](itemCount);

		// Fill array
		for (uint i = 0; i < totalItemCount; i++) {
			if (idToMarketItem[i + 1].creator == msg.sender) {
				uint currentId = idToMarketItem[i + 1].itemId;
				MarketItem storage currentItem = idToMarketItem[currentId];
				items[currentIndex] = currentItem;
				currentIndex += 1;
			}
		}

		return items;
	}


	/**
	 * Returns items currently on sale by caller.
	 */
	function fetchItemsOnSale() public view returns (MarketItem[] memory) {
		// Get total number of items on sale by calling address
		uint totalItemCount = _itemIds.current();
		uint itemCount = 0;
		uint currentIndex = 0;
		for (uint i = 0; i < totalItemCount; i++) {
			if (idToMarketItem[i + 1].seller == msg.sender && idToMarketItem[i + 1].onSale) {
				itemCount += 1;
			}
		}

		// Initialize array
		MarketItem[] memory items = new MarketItem[](itemCount);

		// Fill array
		for (uint i = 0; i < totalItemCount; i++) {
			if (idToMarketItem[i + 1].seller == msg.sender && idToMarketItem[i + 1].onSale) {
				uint currentId = idToMarketItem[i + 1].itemId;
				MarketItem storage currentItem = idToMarketItem[currentId];
				items[currentIndex] = currentItem;
				currentIndex += 1;
			}
		}

		return items;
	}


	/**
	 * Returns detail of a market item.
	 */
	function fetchItem(uint256 itemId) public view returns (MarketItem memory) {
		return idToMarketItem[itemId];
	}


	/**
	 * Checks if a contract supports EIP-2981 for royalties.
	 * View EIP-165 (https://eips.ethereum.org/EIPS/eip-165).
	 */
	function _checkRoyalties(address _contract) internal view returns (bool) {
        (bool success) = IERC165(_contract).supportsInterface(_INTERFACE_ID_ERC2981);
		return success;
    }


	/**
	 * Pays royalties to the address designated by the NFT contract and returns the sale place
	 * minus the royalties payed.
	 */
	function _deduceRoyalties(address nftContract, uint256 tokenId, uint256 grossSaleValue, address payable seller) 
		internal returns (uint256 netSaleAmount) {
        // Get amount of royalties to pay and recipient
        (address royaltiesReceiver, uint256 royaltiesAmount) = IERC2981(nftContract).royaltyInfo(tokenId, grossSaleValue);

    	// If seller and royalties receiver are the same, royalties will not be deduced
        if (seller == royaltiesReceiver) {
			return grossSaleValue;
        }

        // Deduce royalties from sale value
        uint256 netSaleValue = grossSaleValue - royaltiesAmount;

        // Transfer royalties to rightholder if amount is not 0
        if (royaltiesAmount > 0) {
			(bool success, ) = royaltiesReceiver.call{value: royaltiesAmount}("");
			require(success, "CoralMarketplace: Royalties transfer failed.");
        }

        // Broadcast royalties payment
        emit RoyaltiesPaid(tokenId, royaltiesAmount);

        return netSaleValue;
    }

}