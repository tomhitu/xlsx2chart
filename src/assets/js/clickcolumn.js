let excel_column = []
let excel_data = {}
let excel_X = 'index'

/**
 * get the ul element
 * @type {HTMLElement}
 */
const ulElement = document.getElementById('itemList');
const tooltip = document.querySelector(".tooltip");

$(document).ready(function() {
    $('#clickfileupload').on('click', function() {
        /**
         * define a new click event to trigger the file input
         */
        $('#fileInput').click();
    });

    $('#fileupload').on('click', function() {
        $('#fileInput').click();
    });

    $('#fileInput').on('change', function(event) {
        /**
         * control the original page
         */
        const selectedFile = event.target.files[0];
        readExcelContent(selectedFile);
        document.getElementById("fileupload").style.display = "none";
        document.getElementById("barchart").style.display = "block";
    });
});

function readExcelContent(file) {
    const reader = new FileReader();

    reader.onload = function(event) {
        const fileData = event.target.result;
        document.getElementById("filename").innerHTML = 'File name: ' + file.name
        /**
         * read the file data
         */
        const workbook = XLSX.read(fileData, { type: 'binary' });
        /**
         * get the first sheet
         */
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        /**
         * convert the sheet to json
         * @type {[]}
         */
        const excelData = XLSX.utils.sheet_to_json(sheet);

        sendExcelDataToPython(excelData);
    };

    reader.readAsBinaryString(file);
}

function sendExcelDataToPython(data) {
    $.ajax({
        /**
         * send the excel data to python
         * local host
         * route: /receive-excel-data
         */
        url: 'http://localhost:5000/receive-excel-data',
        method: 'POST',
        data: JSON.stringify({ excel_data: data }),
        contentType: 'application/json',
        success: function(data) {
            console.log('Excel data sent successfully');
            excel_data = data;
            excel_column = [];
            /**
             * get the column names of the excel data
             */
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const value = data[key];

                    if (Array.isArray(value)) {
                        excel_column.push(key);
                    }
                }
            }

            const foundItem = excel_column.find(item => item.includes("index") || item.includes("date"));

            /**
             * if the column name contains 'index' or 'date', then define it as the X-axis
             * otherwise, define the first column as the X-axis
             */
            if (foundItem) {
                console.log("Found item:", foundItem);
                excel_X = foundItem;
                document.getElementById("xaxis").innerHTML = 'X axis: ' + excel_X
            } else {
                console.log("No item found containing 'index' or 'date', so define the first column as the X-axis.");
                excel_X = excel_column[0];
                document.getElementById("xaxis").innerHTML = 'X axis: ' + excel_X
            }
            tooltip.style.display = "block";

            /**
             * remove all child elements
             * clean the current ul element
             */
            while (ulElement.firstChild) {
                ulElement.removeChild(ulElement.firstChild);
            }

            excel_column.forEach(item => {
                const liElement = document.createElement('li');
                liElement.textContent = item;

                liElement.addEventListener('click', function() {
                    /**
                     * add event listener to each element
                     * @type {string}
                     */
                    excel_X = this.textContent;
                    document.getElementById("xaxis").innerHTML = 'X axis: ' + excel_X
                    tooltip.style.display = "block";
                    /**
                     * update x axis
                     */
                    updateLineChart(excel_data, excel_X);
                });
                /**
                 * append the li element to the ul element
                 */
                ulElement.appendChild(liElement);
            });

            /**
             * update the line chart
             */
            updateLineChart(excel_data, excel_X);
        }
    });
}

const inputElement = document.getElementById('keywordsinput');

inputElement.addEventListener('input', function(event) {
    const inputValue = event.target.value;
    const keywords = inputValue.split(' ');

    opov.series.forEach((series) => {
        let containsKeyword = false;
        for (const keyword of keywords) {
            if (series.name.includes(keyword) && keyword !== '') {
                containsKeyword = true;
                break;
            }
        }
        series.yAxisIndex = containsKeyword ? 1 : 0;
    });

    rbaChart.setOption(opov, true);
});


