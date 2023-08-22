let barpage = document.getElementById('barchart');

let rbaChart = echarts.init(barpage);
let opov;

let excel_type = []
let excelX = []
let excelList = []


function updateLineChart(show_excel_data, nameToRemove='data-date') {
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
                data: data
            }));

        excelList = Object.entries(show_excel_data)
            .filter(([name, data]) => name !== nameToRemove)
            .map(([name, data]) => ({
                name: name,
                type: 'bar',
                // yAxisIndex: name.includes('size') ? 1 : 0,
                data: data
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
                },
                {
                    nameLocation: 'start',
                    alignTicks: true,
                    type: 'value',
                    // inverse: true
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
    }
    catch (err) {
        console.log(err);
    }
}

