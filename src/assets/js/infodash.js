let barpage = document.getElementById('barchart');

let rbaChart = echarts.init(barpage);
let opov;

let excel_type = []
let excelX = []
let excelList = []


function updateLineChart(show_excel_data, nameToRemove='data-date') {
    try {
        excel_type = Object.entries(show_excel_data)
            .filter(([name, data]) => name !== nameToRemove)
            .map(([name, data]) => name);

        console.log(['Growth'].concat(excel_type));

        excelX = Object.entries(show_excel_data)
            .filter(([name, data]) => name === nameToRemove)
            .map(([name, data]) => ({
                type: 'category',
                boundaryGap: false,
                data: data
            }));

        excelList = Object.entries(show_excel_data)
            .filter(([name, data]) => name !== nameToRemove)
            .map(([name, data]) => ({
                name: name,
                type: 'bar',
                data: data
            }))

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
                    mark: { show: true },
                    dataView: { show: false, readOnly: false },
                    magicType: { show: true, type: ['line', 'bar'] },
                    restore: { show: true },
                    saveAsImage: { show: true }
                },
                top: 50,
            },
            calculable: true,
            legend: {
                data: ['Growth'].concat(excel_type),
                itemGap: 5
            },
            grid: {
                top: '12%',
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
                            return isFinite(a) ? echarts.format.addCommas(+a / 1000) : '';
                        }
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

        opov & rbaChart.setOption(opov);
    }
    catch (err) {
        console.log(err);
    }
}

