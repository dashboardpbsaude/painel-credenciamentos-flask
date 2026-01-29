from flask import Flask, render_template, jsonify, request
from services.sheets import get_credenciamentos, get_medicos

app = Flask(__name__)

df_cred = get_credenciamentos()
df_med = get_medicos()

print("LINHAS CRED:", len(df_cred))
print("COLUNAS CRED:", df_cred.columns.tolist())


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/credenciamentos")
def credenciamentos():
    return jsonify(df_cred.fillna("").to_dict(orient="records"))


@app.route("/api/medicos")
def medicos():
    edital = request.args.get("edital")
    unid = request.args.get("unid")
    empresa = request.args.get("empresa")

    df = df_med[
        (df_med["EDITAL"] == edital) &
        (df_med["UNID"] == unid) &
        (df_med["EMPRESA"] == empresa)
    ]

    return jsonify(df.fillna("").to_dict(orient="records"))


if __name__ == "__main__":
    app.run(debug=True)
