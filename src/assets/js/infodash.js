let barpage = document.getElementById('barchart');

let rbaChart = echarts.init(barpage);
let opov;

let excel_type = []
let excelX = []
let excelList = []


function updateLineChart(show_excel_data, nameToRemove='data-date') {
    let xtype = document.getElementById('radio1').checked ? 'category' : 'value';
    let templateoption = rbaChart.getOption();
    if (templateoption && templateoption.xAxis) {
        xtype = rbaChart.getOption().xAxis[0].type;
    }
    if (xtype === 'category') {
        try {
            /**
             * update excel type, X axis and lists of Y axis
             * Object.entries() returns an array to original object and cover its value
             * @type {string[]}
             */
            excel_type = Object.entries(show_excel_data)
                .filter(([name, data]) => name !== nameToRemove)
                .map(([name, data]) => name);

            excelX = Object.entries(show_excel_data)
                .filter(([name, data]) => name === nameToRemove)
                .map(([name, data]) => ({
                    type: 'category',
                    boundaryGap: false,
                    data: data,
                    axisLabel: {
                        fontSize: 12
                    }
                }));

            excelList = Object.entries(show_excel_data)
                .filter(([name, data]) => name !== nameToRemove)
                .map(([name, data]) => ({
                    name: name,
                    type: 'line',
                    // yAxisIndex: name.includes('size') ? 1 : 0,
                    data: data,
                }))

            /**
             * update the line chart
             * @type {{yAxis: [{axisLabel: {formatter: (function(*): *|string)}, type: string},{alignTicks: boolean, nameLocation: string, type: string}], xAxis: {data: *, type: string, boundaryGap: boolean}, calculable: boolean, legend: {itemGap: number, data: string[]}, grid: {top: string, left: string, right: string, containLabel: boolean}, series: {data: *, name: *, type: string, yAxisIndex: number}[], tooltip: {axisPointer: {label: {show: boolean}, type: string}, trigger: string}, toolbox: {feature: {saveAsImage: {show: boolean}, restore: {show: boolean}, magicType: {show: boolean, type: string[]}, dataView: {show: boolean, readOnly: boolean}, mark: {show: boolean}}, top: number, show: boolean}, dataZoom: [{show: boolean, start: number, end: number},{start: number, end: number, type: string},{filterMode: string, left: string, showDataShadow: boolean, show: boolean, width: number, yAxisIndex: number, height: string}]}}
             */
            opov = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow',
                        label: {
                            show: true
                        }
                    }
                },
                toolbox: {
                    show: true,
                    feature: {
                        mark: {show: true},
                        dataView: {show: false, readOnly: false},
                        magicType: {show: true, type: ['line', 'bar']},
                        restore: {show: true},
                        saveAsImage: {show: true}
                    },
                    top: 50,
                },
                calculable: true,
                legend: {
                    data: ['Growth'].concat(excel_type),
                    itemGap: 15,
                    textStyle: {
                        fontSize: 12, // Set the font size for legend
                        color: '#797b83'
                    }
                },
                grid: {
                    top: '20%',
                    left: '1%',
                    right: '10%',
                    containLabel: true
                },
                xAxis: excelX[0],
                yAxis: [
                    {
                        type: 'value',
                        axisLabel: {
                            formatter: function (a) {
                                a = +a;
                                return isFinite(a) ? echarts.format.addCommas((+a).toFixed(1)) : '';
                            },
                            fontSize: 12
                        }
                    },
                    {
                        nameLocation: 'start',
                        alignTicks: true,
                        type: 'value',
                        // inverse: true,
                        axisLabel: {
                            formatter: function (a) {
                                a = +a;
                                return isFinite(a) ? echarts.format.addCommas((+a).toFixed(1)) : '';
                            },
                            fontSize: 12
                        }
                    }
                ],
                dataZoom: [
                    {
                        show: true,
                        start: 0,
                        end: 100
                    },
                    {
                        type: 'inside',
                        start: 0,
                        end: 100
                    },
                    {
                        show: true,
                        yAxisIndex: 0,
                        filterMode: 'empty',
                        width: 30,
                        height: '80%',
                        showDataShadow: false,
                        left: '93%'
                    }
                ],
                series: excelList
            };
            /**
             * true means cover the original option
             */
            rbaChart.setOption(opov, true);
        } catch (err) {
            console.log(err);
        }
    }
    else {
        try {
            excel_type = Object.entries(show_excel_data)
                .filter(([name, data]) => name !== nameToRemove)
                .map(([name, data]) => name);

            excelList = [];

            excelX = Object.entries(show_excel_data)
                .filter(([name, data]) => name === nameToRemove)
                .map(([name, data]) => (data));

            excelX = excelX[0]

            let minX = Math.min(...excelX);
            let maxX = Math.max(...excelX);

            excelList = Object.entries(show_excel_data)
                .filter(([name, data]) => name !== nameToRemove)
                .map(([name, data]) => {
                    let pairedData = data.map((yValue, index) => {
                        let pair = [excelX[index], yValue];
                        return pair;
                    });
                    pairedData.sort((a, b) => a[0] - b[0]);
                    return {
                        name: name,
                        type: 'line',
                        data: pairedData
                    };
                });

            opov = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow',
                        label: {
                            show: true
                        }
                    }
                },
                toolbox: {
                    show: true,
                    feature: {
                        mark: {show: true},
                        dataView: {show: false, readOnly: false},
                        magicType: {show: true, type: ['line', 'bar']},
                        restore: {show: true},
                        saveAsImage: {show: true}
                    },
                    top: 50,
                },
                calculable: true,
                legend: {
                    data: ['Growth'].concat(excel_type),
                    itemGap: 15,
                    textStyle: {
                        fontSize: 12, // Set the font size for legend
                        color: '#797b83'
                    }
                },
                grid: {
                    top: '20%',
                    left: '1%',
                    right: '10%',
                    containLabel: true
                },
                xAxis: [{
                    type: 'value',
                    axisLabel: {
                        fontSize: 12
                    },
                    min: minX,
                    max: maxX
                }],
                yAxis: [
                    {
                        type: 'value',
                        axisLabel: {
                            formatter: function (a) {
                                a = +a;
                                return isFinite(a) ? echarts.format.addCommas((+a).toFixed(1)) : '';
                            },
                            fontSize: 12
                        }
                    },
                    {
                        nameLocation: 'start',
                        alignTicks: true,
                        type: 'value',
                        // inverse: true,
                        axisLabel: {
                            formatter: function (a) {
                                a = +a;
                                return isFinite(a) ? echarts.format.addCommas((+a).toFixed(1)) : '';
                            },
                            fontSize: 12
                        }
                    }
                ],
                dataZoom: [
                    {
                        show: true,
                        start: 0,
                        end: 100
                    },
                    {
                        type: 'inside',
                        start: 0,
                        end: 100
                    },
                    {
                        show: true,
                        yAxisIndex: 0,
                        filterMode: 'empty',
                        width: 30,
                        height: '80%',
                        showDataShadow: false,
                        left: '93%'
                    }
                ],
                series: excelList
            };

            rbaChart.setOption(opov, true);

        }
        catch (err) {
            console.log(err);
        }
    }
}

