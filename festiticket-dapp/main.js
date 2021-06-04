var web3 = new Web3(web3.currentProvider);
var shop, VNDT, ticket;
var myAccount, adminAccount;
var origTicketPrice;
var VNDTDecimals;
var myTickets = [];
var currentTicket = 0;
var totalTicket;

$(document).ready(function () {
    window.ethereum.enable().then(function (accounts) {
        console.log("Initializing abi shop at " + festivalShopAddress);
        shop = new web3.eth.Contract(abiFestivalShop, festivalShopAddress, {from: accounts[0]});
        console.log("Initializing abi VNDT at " + currencyTokenAddress);
        VNDT = new web3.eth.Contract(abiCurrencyToken, currencyTokenAddress, {from: accounts[0]});
        console.log("Initializing abi ticket at " + festiTicketAddress);
        ticket = new web3.eth.Contract(abiFestiTicket, festiTicketAddress, {from: accounts[0]});
        VNDT.methods.decimals().call().then(function (decimals) {
            VNDTDecimals = decimals;
            console.log("VNDT uses " + decimals + " decimals");
            fetchAccountAndData();
        });
    });
    $("#buy_button").click(buy);
    $("#buy_button_for").click(buy_for);
    $("#offer_button").click(offer);
    $("#use_button").click(use_ticket);

    $("#buy_offered_button").click(buy_offered);
    $("#buy_offered_button_for").click(buy_offered_for);
    $("#withdraw_button").click(withdraw);

    $("#prev").click(prev);
    $("#next").click(next);

    window.ethereum.on('accountsChanged', function (accounts) {
        fetchAccountAndData();
    })
});

function fetchAccountAndData() {
    myAccount = web3.eth.getAccounts().then(function (accounts) {
        myAccount = accounts[0];
        console.log("My account: " + myAccount);
        adminAccount = shop.methods.owner().call().then(function (accounts) {
            adminAccount = accounts;
            console.log("Admin account: " + adminAccount);
            if(myAccount!=adminAccount) {
                console.log("You are not admin");
                $("#my-account-button").attr("href", "account.html");
                $("#my-account-button").text("My ticket");
            }
            else {
              console.log("You are admin");
                $("#my-account-button").attr("href", "admin.html");
                $("#my-account-button").text("Dashboard");
            }
        });
        getData();

    });
}

function prettyBalance(arg) {
    return ((parseInt(arg) / (10 ** VNDTDecimals)).toFixed(VNDTDecimals)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function getData() {
    console.log("Getting balance of shop " + festivalShopAddress);

    VNDT.methods.balanceOf(festivalShopAddress).call().then(function (res) {
        console.log(res);
        var amount = prettyBalance(res);
        console.log("Current contract balance: " + amount);
        $("#shopBalance").text(amount);
    });
    let myPerttyAccount = myAccount.toString().slice(0, 6) + "..." + myAccount.toString().slice(-4);
    $("#my-account").text(myPerttyAccount);
    console.log("Getting balance of my account " + myAccount);
    VNDT.methods.balanceOf(myAccount).call().then(function (res) {
        console.log(res);

        var amount = prettyBalance(res);
        console.log("myAccount balance: " + res);
        $("#accVNDT").text(amount);
        $("#my-balance").text(amount+" VNDT");
    });
    console.log("Getting original ticket price");
    shop.methods.getOriginalPrice().call().then(function (res) {
        console.log(res);
        origTicketPrice = res;
        var amount = prettyBalance(res);
        console.log("original ticket price: " + res);
        $("#ticketPrice").text(amount);
    });

    shop.methods.getTicketsSold().call().then(function (ticketIds) {
        console.log("Tickets sold:" + JSON.stringify(ticketIds));
        $("#ticketCount").text(ticketIds.length);
        $("#my-offering-ticket").empty();
        $("#my-offering-ticket").append("<tr>\n" +
            "                            <th>Ticket</th>\n" +
            "                            <th>Price</th>\n" +
            "                            <th>Last sold for</th>\n" +
            "                            <th></th>\n" +
            "                        </tr>");

        $("#ticketInfo").empty();
        $("#ticketInfo").append(function () {
            return '<div id="ticketdetails"/>'
        });

        $("#resaleTicketInfo").empty();
        $("#resaleTicketInfo").append(function () {
            return '<div id="forsaleinfo"/>'
        });
        let ticketInfoCount = 0;
        let resaleTicketInfoCount = 0;
        ticketIds.forEach(function (ticketId) {
            ticket.methods.ownerOf(ticketId).call().then(function (owner) {
                ticketInfoCount++;
                $("#ticketdetails").append(function () {
                    return '<div>Ticket ' + ticketId + ' owned by ' + owner + '</div>'
                });
            });
            shop.methods.getForSalePrice(ticketId).call().then(function (price) {
                resaleTicketInfoCount++;
                if (price <= 0) return true;
                var t = "Ticket " + ticketId + " " + (price > 0 ? " is for sale for " + prettyBalance(price) : " is not for resale");
                var _ticket = "<th>Ticket No." + ticketId + "</th>" + "<th>" + prettyBalance(price) + " VNDT</th>";
                shop.methods.getLastSellPrice(ticketId).call().then(function (sellPrice) {
                    console.log(ticketId);
                    t = t + (". Last sold for " + prettyBalance(sellPrice));
                    _ticket = _ticket + "<th>" + prettyBalance(sellPrice) + " VNDT</th>";
                    console.log(t);
                    $("#forsaleinfo").append(function () {
                        return '<div>' + t + '</div>'
                    });
                    $("#secondary-ticket").append(function () {
                        _ticket = _ticket + "<th><button type=\"button\" id=\"buy_button\" class=\"btn btn-primary button button-primary\" style=\"\n" +
                            "    padding-right: 10px;" +
                            "    padding-left: 10px;" +
                            "    padding-top: 10px;" +
                            "    padding-bottom: 10px;" +
                            "    height: 36px;" +
                            "\" onclick='buy_offered(" + ticketId + ")'>Buy this ticket</button></th>";
                        return '<tr>' + _ticket + '</tr>'
                    });
                    ticket.methods.ownerOf(ticketId).call().then(function (owner) {
                        if (owner == myAccount){
                            _ticket = _ticket + "<th><button type=\"button\" id=\"cancel_button\" class=\"btn btn-primary button button-primary cancel\" style=\"\n" +
                                "    padding-right: 10px;" +
                                "    padding-left: 10px;" +
                                "    padding-top: 10px;" +
                                "    padding-bottom: 10px;" +
                                "    height: 36px;" +
                                "\" onclick='buy_offered(" + ticketId + ")'>Cancel this offer</button></th>";
                            $("#my-offering-ticket").append(function () {
                                return '<tr>' + _ticket + '</tr>'
                            });
                        }
                    });
                });
            });
        });
        if (ticketInfoCount == 0) {
            $("#ticketdetails").append(function () {
                return '<div>No tickets</div>'
            });
        }
        if (resaleTicketInfoCount == 0) {
            $("#forsaleinfo").append(function () {
                return '<div>No tickets</div>'
            });
        }
    });
    myTickets = [];
    ticket.methods.balanceOf(myAccount).call().then(function (amount) {
        console.log("Account owns " + amount + " tickets");
        totalTicket = amount;
        $("#total").text(totalTicket);
        $("#current").text(currentTicket + 1);
        $("#yourtickets").empty();
        $("#yourtickets").append(function () {
            return '<div id="yourticketinfo"/>'
        });
        if (amount == 0) {
            $("#yourticketinfo").append(function () {
                return '<div>No tickets</div>'
            });
            $(".account-hero").css("display","block");
            $("#my-ticket-info").css("display","none");
            $("#my-offering").css("display","none");

        } else {
            console.log("==================================");
            $(".account-hero").css("display","none");
            $("#my-ticket-info").css("display","block");
            $("#my-offering").css("display","block");
            for (i = 0; i < amount; i++) {
                ticket.methods.tokenOfOwnerByIndex(myAccount, i).call().then(function (ticketId) {
                    //console.log("This is: "+i);
                    //$("#yourticketinfo").append(function(){ return '<div>Ticket '+ticketId});
                    shop.methods.getUsedStatus(ticketId).call().then(function (used) {
                        shop.methods.getForSalePrice(ticketId).call().then(function (price) {
                            //var ticket = "<th>Ticket " + ticketId + "</th>" + "<th>" + prettyBalance(price) + " VNDT</th>";
                            myTickets.push({
                                ticketId: ticketId,
                                ticketPrice: origTicketPrice,
                                ticketUsed: used,
                                forSalePrice: price
                            });
                            if (used == true) {
                                $("#yourticketinfo").append(function () {
                                    return '<div>Ticket ' + ticketId + " (used)<div/>"
                                });
                            } else {
                                $("#yourticketinfo").append(function () {
                                    return '<div>Ticket ' + ticketId + "<div/>"
                                });
                            }
                            $("#ticketId").text(myTickets[currentTicket].ticketId);
                            $("#ticket-price").text(prettyBalance(myTickets[currentTicket].ticketPrice) + " VNDT");
                            // if(myTickets[i].forSalePrice != 0) {
                            //     shop.methods.getLastSellPrice(ticketId).call().then(function (sellPrice) {
                            //         ticket = ticket + "<th>" + prettyBalance(sellPrice) + " VNDT</th>" + "<th><button type=\"button\" id=\"buy_button\" class=\"btn btn-primary\" onclick='buy_offered(" + ticketId + ")'>Cancel this offer</button></th>";
                            //         console.log(ticket);
                            //         $("#my-offering-ticket").append(function () {
                            //             return '<tr>' + ticket + '</tr>'
                            //         });
                            //     });
                            // }
                            if(myTickets[currentTicket].ticketUsed) {
                                $("#used").css('display', 'block');
                                $("#reselling").css('display', 'none');
                                $("#use_button").css('display', 'none');
                                $("#offer_button").css('display', 'none');
                            }
                            else {
                                if(myTickets[currentTicket].forSalePrice != 0) {
                                    $("#used").css('display', 'none');
                                    $("#reselling").css('display', 'block');
                                    $("#use_button").css('display', 'none');
                                    $("#offer_button").css('display', 'none');
                                }
                                else {
                                    $("#used").css('display', 'none');
                                    $("#reselling").css('display', 'none');
                                    $("#use_button").css('display', 'block');
                                    $("#offer_button").css('display', 'block');
                                }
                            }
                        });
                    });
                });
            }
        }
    });
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function buy_for() {
    recipient = prompt("Address of person you are buying this ticket for:")
    buy_common(recipient);
}

async function buy() {
    buy_common(myAccount);
}

async function buy_common(recipient) {
    console.log("Buying from account " + myAccount + " for " + recipient);
    web3.eth.getBalance(myAccount, (err, balance) => {
        console.log("Eth balance: " + balance);
    });

    VNDT.methods.balanceOf(myAccount).call().then(function (res) {
        console.log(typeof res);
        console.log(res < origTicketPrice)
        if (res < origTicketPrice) {
            alert("Not enough balance!");
            return;
        }
        ticket.methods.ticketsAvailable().call().then(function (available) {
            console.log("available: "+available);
            if (!available) {
                alert("Sold out!");
                return;
            }
            const approveTx = {
                from: myAccount,
                to: currencyTokenAddress,
                gas: web3.utils.toHex(3000000),
                data: VNDT.methods.approve(festivalShopAddress, origTicketPrice).encodeABI()
            };
            web3.eth.sendTransaction(approveTx, async function (err, transactonHash) {
                console.log("Submitted transaction with hash: ", transactonHash);
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(transactonHash);
                    await sleep(1000);
                }
                console.log("Got the transaction receipt: ", transactionReceipt);
                const buyTx = {
                    from: myAccount,
                    to: festivalShopAddress,
                    gas: web3.utils.toHex(3000000),
                    data: shop.methods.buyTicketFor(recipient).encodeABI()
                }
                web3.eth.sendTransaction(buyTx, async function (err, transactonHash) {
                    console.log("Submitted transaction with hash: ", transactonHash);
                    let transactionReceipt = null
                    while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
                        transactionReceipt = await web3.eth.getTransactionReceipt(transactonHash);
                        await sleep(1000);
                    }
                    console.log("Got the transaction receipt: ", transactionReceipt);
                    getData();
                    location.replace("account.html");
                });
            });
        });
    });
}

async function offer() {
    var tokenId = myTickets[currentTicket].ticketId;
    var input = prompt("Price to sell for:");
    var price = (10 ** VNDTDecimals) * input;
    console.log("Offering ticket " + tokenId + " from account " + myAccount + " for a price of " + prettyBalance(price));
    console.log("Type of price: "+typeof input);
    if (price > origTicketPrice * 1.1) {
        alert("Price must be less than 110% of original ticket price!");
        return;
    }
    if (price <= 0) {
        alert("Price must be greater than 0");
        return;
    }
    if (typeof input != "number") {
        alert("Price must be a number!");
        return;
    }

    const approveTx = {
        from: myAccount,
        to: festiTicketAddress,
        gas: web3.utils.toHex(3000000),
        data: ticket.methods.approve(festivalShopAddress, tokenId).encodeABI()
    };
    web3.eth.sendTransaction(approveTx, async function (err, transactonHash) {
        console.log("Submitted transaction with hash: ", transactonHash);
        let transactionReceipt = null
        while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
            transactionReceipt = await web3.eth.getTransactionReceipt(transactonHash);
            await sleep(1000);
        }
        console.log("Got the transaction receipt: ", transactionReceipt);
        const buyTx = {
            from: myAccount,
            to: festivalShopAddress,
            gas: web3.utils.toHex(3000000),
            data: shop.methods.offerTicket(tokenId, price).encodeABI()
        }
        web3.eth.sendTransaction(buyTx, async function (err, transactonHash) {
            console.log("Submitted transaction with hash: ", transactonHash);
            let transactionReceipt = null
            while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
                transactionReceipt = await web3.eth.getTransactionReceipt(transactonHash);
                await sleep(1000);
            }
            console.log("Got the transaction receipt: ", transactionReceipt);
            getData();
        });
    });
}

async function buy_offered_for() {
    recipient = prompt("Address of person you are buying this ticket for:")
    buy_offered_common(recipient);
}

async function buy_offered(tokenId) {
    buy_offered_common(myAccount, tokenId);
}

async function buy_offered_common(recipient, tokenId) {
    //var tokenId = prompt("Ticket id to buy:");

    shop.methods.getForSalePrice(tokenId).call().then(function (price) {
        if (price == 0) {
            alert("Ticket " + tokenId + " is not for sale!");
            return;
        }
        console.log("Ticket " + tokenId + " was for sale for " + prettyBalance(price));
        VNDT.methods.balanceOf(myAccount).call().then(function (res) {
            console.log(typeof res);
            console.log(res < origTicketPrice)
            if (res < origTicketPrice) {
                alert("Not enough balance!");
                return;
            }
            const approveTx = {
                from: myAccount,
                to: currencyTokenAddress,
                gas: web3.utils.toHex(3000000),
                data: VNDT.methods.approve(festivalShopAddress, price).encodeABI()
            };
            web3.eth.sendTransaction(approveTx, async function (err, transactonHash) {
                console.log("Submitted transaction with hash: ", transactonHash);
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(transactonHash);
                    await sleep(1000);
                }
                console.log("Got the transaction receipt: ", transactionReceipt);
                const buyTx = {
                    from: myAccount,
                    to: festivalShopAddress,
                    gas: web3.utils.toHex(3000000),
                    data: shop.methods.buyOfferedTicketFor(tokenId, recipient).encodeABI()
                }
                web3.eth.sendTransaction(buyTx, async function (err, transactonHash) {
                    console.log("Submitted transaction with hash: ", transactonHash);
                    let transactionReceipt = null
                    while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
                        transactionReceipt = await web3.eth.getTransactionReceipt(transactonHash);
                        await sleep(1000);
                    }
                    console.log("Got the transaction receipt: ", transactionReceipt);
                    getData();
                    location.replace("account.html");
                });
            });
        });
    });
}

async function withdraw() {
    console.log("Withdrawing");
    var amount;
    VNDT.methods.balanceOf(festivalShopAddress).call().then(function (res) {
        amount = web3.utils.toBN(res);
        const approveTx = {
            from: myAccount,
            to: festivalShopAddress,
            gas: web3.utils.toHex(3000000),
            data: shop.methods.withdrawBalance().encodeABI()
        };

        web3.eth.sendTransaction(approveTx, async function (err, transactonHash) {
            console.log("Submitted transaction with hash: ", transactonHash);
            let transactionReceipt = null
            while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
                transactionReceipt = await web3.eth.getTransactionReceipt(transactonHash);
                await sleep(1000);
            }
            console.log("Got the transaction receipt: ", transactionReceipt);
            VNDT.methods.balanceOf(festivalShopAddress).call().then(function (res) {
                console.log(res);
                var amount = prettyBalance(res);
                console.log("Current contract balance: " + amount);
                getData();
                $("#shopBalance").text(amount);
            });
        });
    });
}

async function use_ticket() {
    var tokenId = myTickets[currentTicket].ticketId;
    console.log("Using ticket " + tokenId + " from account " + myAccount);

    const approveTx = {
        from: myAccount,
        to: festivalShopAddress,
        gas: web3.utils.toHex(3000000),
        data: shop.methods.useTicket(tokenId).encodeABI()
    };
    web3.eth.sendTransaction(approveTx, async function (err, transactonHash) {
        console.log("Submitted transaction with hash: ", transactonHash);
        let transactionReceipt = null
        while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
            transactionReceipt = await web3.eth.getTransactionReceipt(transactonHash);
            await sleep(1000);
        }
        console.log("Got the transaction receipt: ", transactionReceipt);
        shop.methods.getUsedStatus(tokenId).call().then(function (used) {
            console.log("ticket " + tokenId + ": " + used);
            if (used) {
                $("#used").css('display', 'block');
                $("#reselling").css('display', 'none');
                $("#use_button").css('display', 'none');
                $("#offer_button").css('display', 'none');
                myTickets[currentTicket].ticketUsed=true;
            }
        });
    });
}

async function next() {
    currentTicket++;
    if (currentTicket == totalTicket) currentTicket = 0;
    $(".show-ticket").fadeOut();
    await sleep(350);
    $("#ticketId").text(myTickets[currentTicket].ticketId);
    $("#ticket-price").text(prettyBalance(myTickets[currentTicket].ticketPrice) + " VNDT");
    $("#current").text(currentTicket+1);
    if(myTickets[currentTicket].ticketUsed) {
        $("#used").css('display', 'block');
        $("#reselling").css('display', 'none');
        $("#use_button").css('display', 'none');
        $("#offer_button").css('display', 'none');
    }
    else {
        if(myTickets[currentTicket].forSalePrice != 0) {
            $("#used").css('display', 'none');
            $("#reselling").css('display', 'block');
            $("#use_button").css('display', 'none');
            $("#offer_button").css('display', 'none');
        }
        else {
            $("#used").css('display', 'none');
            $("#reselling").css('display', 'none');
            $("#use_button").css('display', 'block');
            $("#offer_button").css('display', 'block');
        }
    }
    $(".show-ticket").fadeIn();
}

async function prev() {
    if (currentTicket == 0) currentTicket = totalTicket;
    currentTicket--;
    $(".show-ticket").fadeOut();
    await sleep(350);
    $("#ticketId").text(myTickets[currentTicket].ticketId);
    $("#ticket-price").text(prettyBalance(myTickets[currentTicket].ticketPrice) + " VNDT");
    $("#current").text(currentTicket+1);
    if(myTickets[currentTicket].ticketUsed) {
        $("#used").css('display', 'block');
        $("#reselling").css('display', 'none');
        $("#use_button").css('display', 'none');
        $("#offer_button").css('display', 'none');
    }
    else {
        if(myTickets[currentTicket].forSalePrice != 0) {
            $("#used").css('display', 'none');
            $("#reselling").css('display', 'block');
            $("#use_button").css('display', 'none');
            $("#offer_button").css('display', 'none');
        }
        else {
            $("#used").css('display', 'none');
            $("#reselling").css('display', 'none');
            $("#use_button").css('display', 'block');
            $("#offer_button").css('display', 'block');
        }
    }
    $(".show-ticket").fadeIn();
}