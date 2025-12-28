pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract DigitalCertificate is ERC721, Ownable, ERC721URIStorage, ERC721Enumerable {
    uint256 private _nextTokenId;

    constructor()
        ERC721("Digital Certificate", "DCC")
        Ownable(msg.sender)
    {}

    // Hàm cấp phát chứng chỉ 
    function issueCertificate(address student, string memory tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        _nextTokenId++;
        uint256 tokenId = _nextTokenId;
        _safeMint(student, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable) 
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount)
        internal
        override(ERC721, ERC721Enumerable) 
    {
        super._increaseBalance(account, amount);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}