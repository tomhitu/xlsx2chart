from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


def handle_excel_data(excel_data):
    excel_name = []
    head = 'index'
    firstvalue = excel_data[0]
    startk = 1
    for k, v in firstvalue.items():
        if isinstance(v, int) or isinstance(v, float):
            startk = 0
            break
    if startk == 0:
        for k, v in excel_data[0].items():
            if k[:2] == '__':
                excel_name.append(head + '-' + str(k))
            else:
                excel_name.append(str(k))
    else:
        for k, v in excel_data[0].items():
            if k[:2] == '__':
                excel_name.append(head + '-' + str(v))
            else:
                head = str(k)
                excel_name.append(head + '-' + str(v))

    excel_json = {}
    for item in excel_name:
        excel_json[item] = []

    for i in range(startk, len(excel_data)):
        row = 0
        for k, v in excel_data[i].items():
            excel_json[excel_name[row]].append(v)
            row += 1

    return excel_json


@app.route('/receive-file-path', methods=['POST'])
def receive_file_path():
    data = request.get_json()
    file_path = data.get('file_path')

    # Perform your desired operations with the file path
    # print("Received file path:", file_path)

    return jsonify(message='File path received')


@app.route('/receive-excel-data', methods=['POST'])
def receive_excel_data():
    data = request.get_json()
    excel_data = data.get('excel_data')

    # print("Received excel data:", excel_data)
    excel_json_list = handle_excel_data(excel_data)

    return jsonify(excel_json_list)
