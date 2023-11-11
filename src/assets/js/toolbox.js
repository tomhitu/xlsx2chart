
function updateChart() {
    var legendFontSize = document.getElementById('legend-font-size').value;
    var axisFontSize = document.getElementById('axis-font-size').value;

    var checkbox01 = document.getElementById('01');
    var checkbox02 = document.getElementById('02');

    var a = checkbox01.checked;
    var b = checkbox02.checked;

    rbaChart.setOption({
        legend: {
            textStyle: {
                fontSize: legendFontSize
            }
        },
        xAxis: {
            axisLabel: {
                fontSize: axisFontSize
            }
        },
        yAxis: {
            axisLabel: {
                fontSize: axisFontSize
            }
        },
        dataZoom: [
            {
                show: !a
            },
            {
            },
            {
                show: !b
            }
        ]
    });
}