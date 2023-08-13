let excel_column = []
let excel_data = {}
let excel_X = 'index'

const ulElement = document.getElementById('itemList');

$(document).ready(function() {
    $('#clickfileupload').on('click', function() {
        $('#fileInput').click();
    });

    $('#fileupload').on('click', function() {
        $('#fileInput').click();
    });

    $('#fileInput').on('change', function(event) {
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
        const workbook = XLSX.read(fileData, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(sheet);

        sendExcelDataToPython(excelData);
    };

    reader.readAsBinaryString(file);
}

function sendExcelDataToPython(data) {
    $.ajax({
        url: 'http://localhost:5000/receive-excel-data',
        method: 'POST',
        data: JSON.stringify({ excel_data: data }),
        contentType: 'application/json',
        success: function(data) {
            console.log('Excel data sent successfully');
            // console.log(data);
            excel_data = data;
            excel_column = [];
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const value = data[key];

                    if (Array.isArray(value)) {
                        excel_column.push(key);
                    }
                }
            }

            const foundItem = excel_column.find(item => item.includes("index") || item.includes("date"));

            if (foundItem) {
                console.log("Found item:", foundItem);
                excel_X = foundItem;
                document.getElementById("xaxis").innerHTML = excel_X
            } else {
                console.log("No item found containing 'index' or 'date', so define the first column as the X-axis.");
                excel_X = excel_column[0];
                document.getElementById("xaxis").innerHTML = excel_X
            }


            // clean up the list
            while (ulElement.firstChild) {
                ulElement.removeChild(ulElement.firstChild);
            }

            excel_column.forEach(item => {
                const liElement = document.createElement('li');
                liElement.textContent = item;

                liElement.addEventListener('click', function() {
                    excel_X = this.textContent;
                    // console.log('Clicked item:', excel_X);
                    document.getElementById("xaxis").innerHTML = excel_X
                    updateLineChart(excel_data, excel_X);
                });

                ulElement.appendChild(liElement);
            });

            updateLineChart(excel_data, excel_X);

        }
    });
}

