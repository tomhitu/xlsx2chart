
function updateChart() {
    let legendFontSize = document.getElementById('legend-font-size').value;
    let axisFontSize = document.getElementById('axis-font-size').value;

    let checkbox01 = document.getElementById('01');
    let checkbox02 = document.getElementById('02');

    let radio1 = document.getElementById('radio1');

    let a = checkbox01.checked;
    let b = checkbox02.checked;

    let c = radio1.checked;
    let lasttype = rbaChart.getOption().xAxis[0].type === 'category';

    if (c === lasttype) {
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
    else if(c){
        let options = rbaChart.getOption();
        let xData = options.series[0].data.map(item => item[0]);

        options.xAxis = {
            axisLabel: {
                fontSize: axisFontSize
            },
            boundaryGap: false,
            type: 'category',
            data: xData
        };

        options.series = options.series.map(seriesItem => {
            return {
                ...seriesItem,
                data: seriesItem.data.map(item => item[1])
            };
        });

        options.legend = {
            ...options.legend,
            textStyle: {
                fontSize: legendFontSize
            }
        }

        options.dataZoom = [
            {
                show: !a
            },
            {
            },
            {
                show: !b
            }
        ]

        rbaChart.setOption(options);
    } else {
        let templateX = rbaChart.getOption().xAxis[0].data;
        let getres = validateAndConvertArrayToNumbers(templateX);
        let finalX = [];
        if (getres.status === 0) {
            finalX = getres.message;
            let minX = Math.min(...finalX);
            let maxX = Math.max(...finalX);

            newoptions = rbaChart.getOption();
            let ySeriesData = newoptions.series.map(series => series.data);
            let newSeries = [];

            ySeriesData.forEach((yData, index) => {
                let newSeriesData = finalX.map((xValue, i) => {
                    let yValue = yData.length > i ? yData[i] : null;
                    return [xValue, yValue];
                });

                newSeries.push({
                    ...newoptions.series[index],
                    data: newSeriesData
                });
            });

            newSeries.forEach(series => {
                series.data.sort((a, b) => a[0] - b[0]);
            });


            rbaChart.setOption({
                legend: {
                    textStyle: {
                        fontSize: legendFontSize
                    }
                },
                xAxis: {
                    type: 'value',
                    axisLabel: {
                        fontSize: axisFontSize
                    },
                    min: minX,
                    max: maxX
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        fontSize: axisFontSize
                    }
                },
                series: newSeries,
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
    }

}

function validateAndConvertArrayToNumbers(array) {
    var convertedArray = [];

    let res = {
        status: 0,
        message: convertedArray
    }

    for (var i = 0; i < array.length; i++) {
        var item = array[i];
        var convertedNumber = Number(item);

        if (!isNaN(convertedNumber)) {
            convertedArray.push(convertedNumber);
        } else {
            res.status = 200;
            throw new Error("Error happens: " + item);
        }
    }

    return res;
}