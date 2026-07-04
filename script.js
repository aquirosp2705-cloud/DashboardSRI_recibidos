let D=null, vista='compras';
const $=id=>document.getElementById(id);
const fmt=n=>(Math.round((n+Number.EPSILON)*100)/100)
  .toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});

fetch('datos.json').then(r=>r.json()).then(d=>{D=d;iniciar();})
 .catch(()=>{document.body.innerHTML=
   '<p style="padding:30px">No se pudo cargar datos.json</p>';});

function iniciar(){
  $('generado').textContent='Actualizado: '+D.generado;
  const anios=[...new Set([...D.compras,...D.retenciones]
      .map(r=>r.anio).filter(Boolean))].sort().reverse();
  $('fAnio').innerHTML=anios.map((a,i)=>
    `<option value="${a}" ${i===0?'selected':''}>${a}</option>`).join('')
    ||'<option value="">—</option>';
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('activa'));
    t.classList.add('activa'); vista=t.dataset.vista; pintar();
  });
  ['fAnio','fMes'].forEach(id=>$(id).onchange=pintar);
  $('fBusca').oninput=pintar;
  $('btnLimpiar').onclick=()=>{$('fMes').value='';$('fBusca').value='';pintar();};
  pintar();
}

function coincide(r,q){
  if(!q) return true;
  q=q.trim().toUpperCase();
  const nombre=(r.prov||r.razon||'').toUpperCase();
  const ruc=(r.ruc||'');
  // por iniciales: alguna palabra del nombre empieza con lo buscado,
  // o el nombre completo lo contiene; por RUC: contiene los dígitos
  return nombre.split(/\s+/).some(p=>p.startsWith(q))
      || nombre.includes(q) || ruc.includes(q);
}

function filtrados(lista){
  const a=$('fAnio').value, m=$('fMes').value, q=$('fBusca').value;
  return lista.filter(r=>(!a||r.anio===a)&&(!m||r.mes===m)&&coincide(r,q));
}

function llenarMeses(lista){
  const a=$('fAnio').value, sel=$('fMes'), previo=sel.value;
  const meses=[...new Map(lista.filter(r=>!a||r.anio===a)
    .map(r=>[r.mes,r.nmes])).entries()].sort();
  sel.innerHTML='<option value="">Todos los meses</option>'+
    meses.map(([m,n])=>`<option value="${m}">${n}</option>`).join('');
  if([...sel.options].some(o=>o.value===previo)) sel.value=previo;
}

function pintar(){ vista==='compras'?pintarCompras():pintarRet(); }

// ── COMPRAS: mismas columnas del sistema (A-E) ─────────────────────
function pintarCompras(){
  llenarMeses(D.compras);
  const rows=filtrados(D.compras);
  const t={n:0,tot:0,b:0,c:0,d:0,e:0};
  rows.forEach(r=>{t.n++;t.tot+=r.total;t.b+=r.base;t.c+=r.iva;
                   t.d+=r.ng;t.e+=r.csi;});
  $('kpis').innerHTML=kpi('N° Facturas',t.n,0)+kpi('A) Importe total',t.tot)+
    kpi('B) Base IVA',t.b)+kpi('C) IVA',t.c)+
    kpi('D) No grava IVA',t.d)+kpi('E) Compra sin IVA',t.e);

  // resumen mensual con acumulado
  $('tituloMensual').textContent='Resumen mensual de compras';
  const pm=new Map();
  rows.forEach(r=>{
    const k=r.mes; if(!pm.has(k)) pm.set(k,{nmes:r.nmes,n:0,tot:0,b:0,c:0,d:0,e:0});
    const x=pm.get(k); x.n++;x.tot+=r.total;x.b+=r.base;x.c+=r.iva;x.d+=r.ng;x.e+=r.csi;
  });
  let acum=0;
  const cuerpoM=[...pm.entries()].sort().map(([,x])=>{acum+=x.tot;
    return `<tr><td>${x.nmes}</td><td class=num>${x.n}</td>
      <td class=num><b>${fmt(x.tot)}</b></td><td class=num>${fmt(x.b)}</td>
      <td class=num>${fmt(x.c)}</td><td class=num>${fmt(x.d)}</td>
      <td class=num>${fmt(x.e)}</td><td class="num acum">${fmt(acum)}</td></tr>`;
  }).join('');
  $('tbMensual').innerHTML=
    `<tr><th>MES</th><th class=num>N° FACTURAS</th><th class=num>IMPORTE TOTAL</th>
     <th class=num>BASE IVA</th><th class=num>IVA</th><th class=num>NO GRAVA IVA</th>
     <th class=num>COMPRA SIN IVA</th><th class=num>ACUMULADO</th></tr>`+cuerpoM+
    `<tr class=total><td>TOTAL GENERAL</td><td class=num>${t.n}</td>
     <td class=num>${fmt(t.tot)}</td><td class=num>${fmt(t.b)}</td>
     <td class=num>${fmt(t.c)}</td><td class=num>${fmt(t.d)}</td>
     <td class=num>${fmt(t.e)}</td><td class=num>${fmt(acum)}</td></tr>`;

  // detalle por proveedor
  $('tituloDetalle').textContent=`Detalle por proveedor (${rows.length} facturas)`;
  const pp=new Map();
  rows.forEach(r=>{
    const k=r.ruc+'|'+r.prov;
    if(!pp.has(k)) pp.set(k,{ruc:r.ruc,prov:r.prov,n:0,tot:0,b:0,c:0,d:0,e:0});
    const x=pp.get(k); x.n++;x.tot+=r.total;x.b+=r.base;x.c+=r.iva;x.d+=r.ng;x.e+=r.csi;
  });
  const cuerpoP=[...pp.values()].sort((a,b)=>a.prov.localeCompare(b.prov)).map(x=>
    `<tr><td>${x.ruc}</td><td>${x.prov}</td>
     <td class=num><b>${fmt(x.tot)}</b></td><td class=num>${fmt(x.b)}</td>
     <td class=num>${fmt(x.c)}</td><td class=num>${fmt(x.d)}</td>
     <td class=num>${fmt(x.e)}</td><td class=num>${x.n}</td></tr>`).join('');
  $('tbDetalle').innerHTML=
    `<tr><th>RUC</th><th>PROVEEDOR</th><th class=num>IMPORTE TOTAL</th>
     <th class=num>BASE IVA</th><th class=num>IVA</th><th class=num>NO GRAVA IVA</th>
     <th class=num>COMPRA SIN IVA</th><th class=num>N° FACTURAS</th></tr>`+
    (cuerpoP||'<tr><td colspan=8>Sin datos con estos filtros</td></tr>')+
    (cuerpoP?`<tr class=total><td colspan=2>TOTAL</td>
     <td class=num>${fmt(t.tot)}</td><td class=num>${fmt(t.b)}</td>
     <td class=num>${fmt(t.c)}</td><td class=num>${fmt(t.d)}</td>
     <td class=num>${fmt(t.e)}</td><td class=num>${t.n}</td></tr>`:'');
}

// ── RETENCIONES: columnas estándar del sistema ─────────────────────
function pintarRet(){
  llenarMeses(D.retenciones);
  const rows=filtrados(D.retenciones);
  const xmls=new Set(), t={lineas:0,base:0,valor:0};
  rows.forEach(r=>{xmls.add(r.anio+r.mes+r.ruc+r.fecha+r.codigo+'_'+r.valor);
    t.lineas++;t.base+=r.base;t.valor+=r.valor;});
  $('kpis').innerHTML=kpi('Líneas de retención',t.lineas,0)+
    kpi('Base imponible',t.base)+kpi('Total retenido',t.valor);

  $('tituloMensual').textContent='Resumen mensual de retenciones';
  const pm=new Map();
  rows.forEach(r=>{const k=r.mes;
    if(!pm.has(k)) pm.set(k,{nmes:r.nmes,lineas:0,base:0,valor:0});
    const x=pm.get(k); x.lineas++;x.base+=r.base;x.valor+=r.valor;});
  const cuerpoM=[...pm.entries()].sort().map(([,x])=>
    `<tr><td>${x.nmes}</td><td class=num>${x.lineas}</td>
     <td class=num>${fmt(x.base)}</td><td class=num><b>${fmt(x.valor)}</b></td></tr>`).join('');
  $('tbMensual').innerHTML=
    `<tr><th>MES</th><th class=num>LÍNEAS</th><th class=num>BASE IMPONIBLE</th>
     <th class=num>TOTAL RETENIDO</th></tr>`+cuerpoM+
    `<tr class=total><td>TOTAL GENERAL</td><td class=num>${t.lineas}</td>
     <td class=num>${fmt(t.base)}</td><td class=num>${fmt(t.valor)}</td></tr>`;

  $('tituloDetalle').textContent=`Detalle de retenciones (${rows.length} líneas)`;
  const cuerpo=rows.sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')).map(r=>
    `<tr class="${r.estado==='REVISAR'?'rev':''}"><td>${r.fecha}</td>
     <td>${r.ruc}</td><td>${r.razon}</td><td class=num>${r.codigo}</td>
     <td class=num>${fmt(r.base)}</td><td class=num>${fmt(r.pct)}</td>
     <td class=num><b>${fmt(r.valor)}</b></td><td>${r.estado}</td></tr>`).join('');
  $('tbDetalle').innerHTML=
    `<tr><th>FECHA</th><th>RUC</th><th>RAZÓN SOCIAL</th><th class=num>CÓDIGO</th>
     <th class=num>BASE</th><th class=num>%</th><th class=num>VALOR RETENIDO</th>
     <th>ESTADO</th></tr>`+
    (cuerpo||'<tr><td colspan=8>Sin datos con estos filtros</td></tr>')+
    (cuerpo?`<tr class=total><td colspan=4>TOTAL</td>
     <td class=num>${fmt(t.base)}</td><td></td>
     <td class=num>${fmt(t.valor)}</td><td></td></tr>`:'');
}

function kpi(l,v,dec=2){
  return `<div class=kpi><div class=lbl>${l}</div>
    <div class=num>${dec?('$'+fmt(v)):v}</div></div>`;
}
