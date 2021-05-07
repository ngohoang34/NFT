pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CurrencyToken.sol";
import "./FestiTicket.sol";

contract FestivalShop is Ownable {

    CurrencyToken private _currencyToken;
    FestiTicket private _festiTicket;
    uint256 private _origTicketPrice;
    address payable withdrawalAddress;
    uint256 public constant commissionPercent = 1;

    struct TicketInfo {
        uint256 lastSellPrice;
        uint256 forSalePrice; // 0 means: not for sale.
    }

    mapping(uint256 => TicketInfo) private _ticketInfo;
    uint256[] private _tokenIds;

    constructor(CurrencyToken currencyToken, FestiTicket festiTicket) public {
        require(festiTicket.getTicketTotal() == 0);
        _currencyToken = currencyToken;
        _festiTicket = festiTicket;
        _origTicketPrice = festiTicket.getOriginalPrice();
        withdrawalAddress = msg.sender;

    }

    event BalanceWithdrawn(address _by, address _to, uint256 _amount);
    event ShopBalance(uint256 _contractBalance);

    function buyTicket() public returns (uint256) {
        return buyTicketFor(msg.sender);
    }

    function buyTicketFor(address recipient) public returns (uint256) {
        require(_festiTicket.ticketsAvailable());
        if (!(_currencyToken.transferFrom(msg.sender, address(this), _origTicketPrice))) {
            revert();
        }
        uint256 tokenId = _festiTicket.mint(recipient);
        _ticketInfo[tokenId] = TicketInfo({
        lastSellPrice : _origTicketPrice,
        forSalePrice : 0
        });
        _tokenIds.push(tokenId);
        return tokenId;
    }

    // Offer a ticket for resale fot the requested price. If requestPrice = 0, cancel the existing offer.
    function offerTicket(uint256 tokenId, uint256 requestedPrice) public {
        require(_ticketInfo[tokenId].lastSellPrice != uint256(0));
        // Cannot sell a ticket for 0. So we check for ticket existence.
        require(_festiTicket.ownerOf(tokenId) == msg.sender);
        require(requestedPrice <= 11 * _origTicketPrice / 10);
        _ticketInfo[tokenId].forSalePrice = requestedPrice;
    }

    function buyOfferedTicket(uint256 tokenId) public {
        buyOfferedTicketFor(tokenId, msg.sender);
    }

    function buyOfferedTicketFor(uint256 tokenId, address recipient) public {
        require(_ticketInfo[tokenId].forSalePrice != uint256(0));
        // Ticket must be for sale.
        address owner = _festiTicket.ownerOf(tokenId);
        uint256 forSalePrice = _ticketInfo[tokenId].forSalePrice;
        require(_currencyToken.allowance(msg.sender, address(this)) >= forSalePrice);

        if (!(_currencyToken.transferFrom(msg.sender, address(this), forSalePrice * commissionPercent / 100))) {
            revert();
        }
        if (!(_currencyToken.transferFrom(msg.sender, owner, forSalePrice * (100 - commissionPercent) / 100))) {
            revert();
        }

        _festiTicket.safeTransferFrom(owner, recipient, tokenId);
        _ticketInfo[tokenId].lastSellPrice = _ticketInfo[tokenId].forSalePrice;
        _ticketInfo[tokenId].forSalePrice = 0;
    }

    function getOriginalPrice() external view returns (uint256) {
        return _origTicketPrice;
    }

    function getTicketsSold() external view returns (uint256[] memory) {
        return _tokenIds;
    }

    function getLastSellPrice(uint256 tokenId) external view returns (uint256) {
        return _ticketInfo[tokenId].lastSellPrice;
    }

    function getForSalePrice(uint256 tokenId) external view returns (uint256) {
        return _ticketInfo[tokenId].forSalePrice;
    }

    function getOwnerAdress() external view returns (uint256) {
        return uint256(withdrawalAddress);
    }

    function withdrawBalance()
    public
    onlyOwner
    {
        _currencyToken.transfer(msg.sender, _currencyToken.balanceOf(address(this)));
        //uint256 _contractBalance = uint256(address(this).balance);
        emit BalanceWithdrawn(msg.sender, withdrawalAddress, _currencyToken.balanceOf(address(this)));
        //withdrawalAddress.transfer(_contractBalance);
        //emit BalanceWithdrawn(msg.sender,withdrawalAddress,_contractBalance);
    }

    function useTicket(uint256 _ticketId)
    public
    {
        _festiTicket.useTicket(_ticketId);
        //emit TicketDestroyed(msg.sender, _ticketId);
    }

}
