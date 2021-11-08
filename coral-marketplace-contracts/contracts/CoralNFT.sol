// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract CoralNFT is Ownable, ERC721URIStorage {
	// bytes4(keccak256("royaltyInfo(uint256,uint256)")) == 0x2a55205a
	bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

	using Counters for Counters.Counter;
	Counters.Counter private _tokenIds;
	address marketplaceAddress;
	mapping(bytes4 => bool) private _supportedInterfaces;

	struct RoyaltyInfo {
        address recipient;
        uint24 amount;
    }

	mapping(uint256 => RoyaltyInfo) internal _royalties;
	

	constructor(address _marketplaceAddress) ERC721("Coral NFT", "CORAL") {
		marketplaceAddress = _marketplaceAddress;
	}


	/**
	 * Creates a new token
	 */
	function createToken(string memory tokenURI, address royaltyRecipient, uint256 royaltyValue) public returns (uint) {
		_tokenIds.increment();
		uint256 tokenId = _tokenIds.current();

		_mint(msg.sender, tokenId);
		_setTokenURI(tokenId, tokenURI);
		setApprovalForAll(marketplaceAddress, true);

		if (royaltyValue > 0) {
            _setTokenRoyalty(tokenId, royaltyRecipient, royaltyValue);
        }

		return tokenId;
	}


	/**
	 * Sets token royalties recipient and percentage value (with two decimals) for a certain token
	 */
	function _setTokenRoyalty(uint256 tokenId, address recipient, uint256 value) internal {
        require(value <= 5000, 'CoralNFT: Royalties value cannot be higher than 5000.');
        _royalties[tokenId] = RoyaltyInfo(recipient, uint24(value));
    }


	/**
	 * Returns royalties recipient and amount for a certain token and sale value,
	 * following EIP-2981 guidelines (https://eips.ethereum.org/EIPS/eip-2981).
	 */
    function royaltyInfo(uint256 tokenId, uint256 saleValue) external view returns (address receiver, uint256 royaltyAmount) {
        RoyaltyInfo memory royalty = _royalties[tokenId];
        return (royalty.recipient, (saleValue * royalty.amount) / 10000);
    }


	/**
	 * Overrides supportsInterface method to include EIP-2981 support for interface.
	 */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId) || interfaceId == _INTERFACE_ID_ERC2981;
    }

}