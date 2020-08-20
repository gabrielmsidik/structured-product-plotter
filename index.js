let ctx = document.getElementById('myChart').getContext('2d');
let datasetList = [];
let stockPrice = 100;

let DEFAULT_OPTIONS = {
    scales: {
        yAxes: [{
            ticks: {
                beginAtZero: false
            },
            scaleLabel: {
                display: true,
                labelString: "Resultant Pay-off"
            }
        }],
        xAxes: [{
            scaleLabel: {
                display: true,
                labelString: "Stock Price @Expiry"
            }
        }]
    }
}

Chart.pluginService.register({
    beforeInit: function(chart) {
        var data = chart.config.data;
        for (var i = 0; i < data.datasets.length; i++) {
            for (var j = 0; j < data.labels.length; j++) {
            	var fct = data.datasets[i].function,
                	x = data.labels[j],
                	y = fct(x);
                data.datasets[i].data.push(y);
            }
        }
    }
});

let dataHolder = {
	labels: obtain_labels(stockPrice),
    datasets: datasetList
};

let myChart = new Chart(ctx, {
    type: 'line',
    data: dataHolder,
    options: DEFAULT_OPTIONS
});

function obtain_labels(stockPrice) {
    labels = [];
    for (let i = 0; i < 15; i++) {
        labels.push(stockPrice - 70 + i * 10);
    }
    return labels;
}

const button = document.querySelector('button');
button.addEventListener('click', addNewInput);
let strikePriceInputElement = document.getElementById("strike-price");

const aggregateButton = document.querySelectorAll('button')[1];
aggregateButton.addEventListener('click', aggregateInputs);

const clearButton = document.querySelectorAll('button')[2];
clearButton.addEventListener('click', clearData);

strikePriceInputElement.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
        button.click();
    }
});


function clearData () {

    dataHolder = {
        labels: obtain_labels(stockPrice),
        datasets: []
    };
    
    let myChart = new Chart(ctx, {
        type: 'line',
        data: dataHolder,
        options: DEFAULT_OPTIONS
    });
    
    let optionsTable = document.getElementById('currentOptions');
    optionsTable.innerHTML = `<tr>
        <th>Option Type</th>
        <th>Position</th>
        <th>Strike Price</th>
        <th>OptionPrice</th>
        <th>Quantity</th>
    </tr>`;
}

function generateFunction(isCall, isLong, strikePrice, optionsPrice) {
    
    if (isCall && isLong) {
        return function(x) {return Math.max(0, x - strikePrice) - optionsPrice};
    } else if (isCall && !isLong) {
        return function(x) {return -1 * Math.max(0, x - strikePrice) - optionsPrice };
    } else if (!isCall && isLong) {
        return function(x) {return Math.max(0, strikePrice - x) - optionsPrice};
    }

    return function(x) {return -1 * Math.max(0, strikePrice - x) - optionsPrice}
}

function randomRGBA() {
    let o = Math.round, r = Math.random, s = 255;
    return 'rgba(' + o(r()*s) + ',' + o(r()*s) + ',' + o(r()*s) + ',' + r().toFixed(1) + ')';
}

function addNewInput() {

    let isCall = document.getElementById("call").checked;
    let isLong = document.getElementById("long").checked;
    let strikePrice = document.getElementById("strike-price").value;
    stockPrice = document.getElementById("stockPrice").value;
    let interestRate = document.getElementById("interestRate").value/100;
    let volatility = document.getElementById("volatility").value/100;
    let timeToExpiration = document.getElementById("timeToExpiration").value;
    
    let optionsPrice = calculateOptionPrice(isCall, isLong, 
        strikePrice, stockPrice,
        interestRate, volatility,
        timeToExpiration
    ); 

    let optionsTable = document.getElementById('currentOptions');
    
    let row = optionsTable.insertRow();
    let optionTypeCell = row.insertCell(0);
    optionTypeCell.innerHTML = isCall ? "Call": "Put"
    let positionCell = row.insertCell(1);
    positionCell.innerHTML = isLong ? "Long": "Short"
    let strikePriceCell = row.insertCell(2);
    strikePriceCell.innerHTML = strikePrice
    let optionPriceCell = row.insertCell(3);
    optionPriceCell.innerHTML = optionsPrice
    let quantityCell = row.insertCell(4);
    quantityCell.innerHTML = 1

    generatedFunction = generateFunction(isCall, isLong, strikePrice, optionsPrice);

    dataHolder.datasets.push({
        label: dataHolder.datasets.length + 1,
        function: generatedFunction,
        borderColor: randomRGBA(),
        data: [],
        fill: false,
        lineTension: 0
    });
    
    dataHolder.labels = obtain_labels(stockPrice);

    myChart = new Chart(ctx, {
        type: 'line',
        data: dataHolder,
        options: DEFAULT_OPTIONS
    });
}

function cdfNormal(x) {
    return (1 - math.erf((- x ) / (Math.sqrt(2) * 1))) / 2
}

function calculateOptionPrice(isCall, isLong, 
    strikePrice, stockPrice,
    interestRate, volatility,
    timeToExpiration
) {

    // To return negative price if shorting the option (selling the option rather than purchasing)
    let d1 = (Math.log(stockPrice/strikePrice) + timeToExpiration * (interestRate + Math.pow(volatility, 2)/2))/(volatility * Math.sqrt(timeToExpiration));
    let d2 = d1 - volatility * Math.sqrt(timeToExpiration);
    
    let price = 1;
    if (isCall) {
        price = stockPrice * cdfNormal(d1) - strikePrice * Math.exp(-1 * interestRate * timeToExpiration) * cdfNormal(d2);
    } else {
        // for put options
        price = strikePrice * Math.exp(-1 * interestRate * timeToExpiration) * cdfNormal(-1 * d2) - stockPrice * cdfNormal(-1 * d1);
    }

    price = Math.round(price * 1000)/1000;

    return isLong ? price: -price;
}

function aggregateInputs() {

    const existingFunctions = dataHolder.datasets.map(element => {
        return element.function;
    });

    let aggregate =  (functions) => {
        return (x) => {
            let result = 0;
            functions.forEach((fn) => {
                result += fn(x);
            })
            return result;
        }
    }

    let newFunction = aggregate(existingFunctions);

    const aggregatedDataHolder = {
        labels: obtain_labels(stockPrice),
        datasets: []
    };

    aggregatedDataHolder.datasets.push({
        label: "Aggregate",
        function: newFunction,
        borderColor: "rgba(75, 192, 192, 1)",
        data: [],
        fill: false,
        lineTension: 0
    });

    myChart = new Chart(ctx, {
        type: 'line',
        data: aggregatedDataHolder,
        options: DEFAULT_OPTIONS
    });
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}
