// ======================= static/js/app.js =======================
let dados = [];

$(document).ready(function () {

    $.get("/api/credenciamentos", function (resp) {
        dados = resp;
        carregarFiltros(dados);
        renderizar(dados);
    });

    $("select").on("change", aplicarFiltros);

    $("#btnLimpar").on("click", function () {
        $("select").val(null).trigger("change");
        renderizar(dados);
    });
});

function carregarFiltros(dados){
    preencher("#filtroAno",[...new Set(dados.map(d=>d.EDITAL?.slice(-4)))]);
    preencher("#filtroEdital",[...new Set(dados.map(d=>d.EDITAL))]);
    preencher("#filtroUnid",[...new Set(dados.map(d=>d.UNID))]);
    preencher("#filtroEspecialidade",[...new Set(dados.map(d=>d.ESPECIALIDADE))]);
    preencher("#filtroStatus",[...new Set(dados.map(d=>d.STATUS))]);
}

function preencher(id, valores){
    const sel=$(id);
    sel.empty().append(`<option></option>`);
    valores.filter(Boolean).sort().forEach(v=>{
        sel.append(`<option value="${v}">${v}</option>`);
    });
}

function aplicarFiltros(){
    let f={
        ano:$("#filtroAno").val(),
        edital:$("#filtroEdital").val(),
        unid:$("#filtroUnid").val(),
        esp:$("#filtroEspecialidade").val(),
        status:$("#filtroStatus").val()
    };

    const filtrado=dados.filter(d=>{
        const unidReg=(d.UNID||"").toUpperCase();
        const unidFil=(f.unid||"").toUpperCase();

        return (
            (!f.ano || d.EDITAL.endsWith(f.ano)) &&
            (!f.edital || d.EDITAL===f.edital) &&
            (!f.esp || d.ESPECIALIDADE===f.esp) &&
            (!f.status || d.STATUS===f.status) &&
            (!f.unid || unidReg.includes(unidFil))
        );
    });

    renderizar(filtrado);
}

function formatarServico(txt){
    if(!txt) return "";
    return txt.replace(/\n/g,"<br>");
}

function renderizar(lista){
    const container=$("#accordionCred");
    container.empty();

    if(lista.length===0){
        container.html(`<div class="alert alert-warning">Nenhum registro encontrado.</div>`);
        return;
    }

    const grupos={};
    lista.forEach(d=>{
        const k=`${d.EDITAL}|${d.ESPECIALIDADE}|${d.UNID}`;
        if(!grupos[k]){
            grupos[k]={edital:d.EDITAL,especialidade:d.ESPECIALIDADE,unid:d.UNID,linhas:[]};
        }
        grupos[k].linhas.push(d);
    });

    let i=0;
    for(const k in grupos){
        const g=grupos[k];

        g.linhas.sort((a,b)=>
            (a["EMPRESA CREDENCIADA"]||"")
                .localeCompare(b["EMPRESA CREDENCIADA"]||"","pt-BR")
        );

        container.append(`
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#c${i}">
                    📄 ${g.edital} | ${g.especialidade} | ${g.unid}
                </button>
            </h2>

            <div id="c${i}" class="accordion-collapse collapse" data-bs-parent="#accordionCred">
                <div class="accordion-body">
                    <table class="table table-clean">
                        <thead>
                            <tr>
                                <th>EMPRESA</th>
                                <th>SERVIÇO</th>
                                <th>Nº CONTRATO</th>
                                <th>VIGÊNCIA</th>
                                <th>STATUS</th>
                                <th>MÉDICOS</th>
                            </tr>
                        </thead>
                        <tbody>
                        ${(() => {
                            let ultimaEmpresa=null;
                            let html="";
                            g.linhas.forEach(l=>{
                                const mesmaEmpresa = l["EMPRESA CREDENCIADA"] === ultimaEmpresa;

                                let vig="";
                                if(l["VIGÊNCIA INICIAL"]||l["VIGÊNCIA FINAL"]){
                                    vig=`${l["VIGÊNCIA INICIAL"]||""} a ${l["VIGÊNCIA FINAL"]||""}`;
                                }

                                let st=l.STATUS||"";
                                if(l.STATUS==="VIGENTE"){
                                    st=`<span style="color:green;font-weight:600">VIGENTE</span>`;
                                }else if(l.STATUS==="VENCIDO"){
                                    st=`<span style="color:red">VENCIDO</span>`;
                                }

                                html+=`
                                <tr class="${mesmaEmpresa?"linha-continuacao":""}">
                                    <td>${mesmaEmpresa?"...":(l["EMPRESA CREDENCIADA"]||"")}</td>
                                    <td>${mesmaEmpresa?"...":formatarServico(l["SERVIÇO"])}</td>
                                    <td>${l["Nº CONTRATO"]||""}</td>
                                    <td>${vig}</td>
                                    <td>${st}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary"
                                            onclick="abrirMedicos('${l.EDITAL}','${l.UNID}','${l["EMPRESA CREDENCIADA"]}')">
                                            👨‍⚕️
                                        </button>
                                    </td>
                                </tr>`;
                                ultimaEmpresa=l["EMPRESA CREDENCIADA"];
                            });
                            return html;
                        })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`);
        i++;
    }
}

function abrirMedicos(edital,unid,empresa){
    $.get("/api/medicos",{edital,unid,empresa},function(res){
        const tb=$("#tbodyMedicos");
        tb.empty();
        if(!res||res.length===0){
            tb.append(`<tr><td colspan="3">Nenhum médico encontrado</td></tr>`);
        }else{
            res.forEach(m=>{
                tb.append(`
                <tr>
                    <td>${m.PROFISSIONAL||""}</td>
                    <td>${m["CRM-PB"]||""}</td>
                    <td>${m.RQE||""}</td>
                </tr>`);
            });
        }
        new bootstrap.Modal("#modalMedicos").show();
    });
}

// CTRL + clique permite múltiplos accordions
document.addEventListener("click",function(e){
    const btn=e.target.closest(".accordion-button");
    if(!btn) return;

    const targetId=btn.getAttribute("data-bs-target");
    const collapse=document.querySelector(targetId);

    if(e.ctrlKey){
        collapse.removeAttribute("data-bs-parent");
    }else{
        document.querySelectorAll(".accordion-collapse")
            .forEach(el=>el.setAttribute("data-bs-parent","#accordionCred"));
    }
});
