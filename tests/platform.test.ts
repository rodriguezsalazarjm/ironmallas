import { test } from "node:test";
import assert from "node:assert/strict";
import { platformDatabase, asUser, asService, ADMIN, SUPERADMIN, OUTSIDER } from "./platform-fixture";

test("full migrations: CRM, scheduling, immutable quote math/history, work/payments, storage, public content and roles",async () => {
  const db=await platformDatabase();
  try {
    await asUser(db,ADMIN);
    const contact=(await db.query<{id:string}>("insert into public.contacts(name,email,phone,consent,consent_at) values('Fixture contact','fixture@example.invalid','56900000000',true,now()) returning id")).rows[0].id;
    await db.query("update public.contacts set commune='Fixture commune',notes='Corrected detail' where id=$1",[contact]);
    const initial=(await db.query<{id:string}>("select id from public.lead_statuses where key='new'")).rows[0].id;
    const lead=(await db.query<{id:string}>("insert into public.leads(contact_id,service,status_id,source,consent,assigned_to) values($1,'Fixture service',$2,'manual',true,$3) returning id",[contact,initial,ADMIN])).rows[0].id;
    const task=(await db.query<{id:string}>("insert into public.tasks(contact_id,lead_id,title,due_at,assigned_to,created_by) values($1,$2,'Fixture follow up',now()+interval '1 day',$3,$3) returning id",[contact,lead,ADMIN])).rows[0].id;
    await db.query("update public.tasks set status='completed',completed_at=now() where id=$1",[task]);
    const appointment=(await db.query<{id:string}>("insert into public.appointments(contact_id,lead_id,kind,service,starts_at,ends_at,address,commune,created_by) values($1,$2,'visit','Fixture service',now()+interval '2 days',now()+interval '2 days 1 hour','Fixture address','Fixture commune',$3) returning id",[contact,lead,ADMIN])).rows[0].id;
    await db.query("update public.appointments set starts_at=starts_at+interval '1 day',ends_at=ends_at+interval '1 day',status='rescheduled' where id=$1",[appointment]);
    await db.query("update public.appointments set status='cancelled' where id=$1",[appointment]);
    await assert.rejects(db.query("update public.appointments set ends_at=starts_at-interval '1 hour' where id=$1",[appointment]));
    assert.equal((await db.query("select * from public.audit_logs where entity='appointments' and action='update'")).rows.length,2);
    await assert.rejects(db.query("insert into public.pricing_rules(name,unit,unit_price) values('Forbidden','fixed',1)"));
    await assert.rejects(db.query("select public.save_quote($1,$2,null,'[]',0,null,null)",[contact,lead]));
    await asUser(db,SUPERADMIN);
    await db.query("insert into public.settings(key,value,updated_by) values('commercial',$1,$2)",[JSON.stringify({tax_bps:1900,validity_days:15,payment_terms:"Fixture terms",company:{name:"Fixture business"}}),SUPERADMIN]);
    const rule=(await db.query<{id:string}>("insert into public.pricing_rules(name,unit,unit_price,min_price,surcharge_bps,max_discount_bps) values('Fixture tariff','m2',10001,15000,500,1000) returning id")).rows[0].id;
    const items=JSON.stringify([{rule_id:rule,width_mm:2000,height_mm:1500,quantity_milli:1000,description:"",location:"Fixture location"}]);
    await asUser(db,ADMIN);
    await assert.rejects(db.query("select public.save_quote($1,$2,null,$3,1001,null,null)",[contact,lead,items]));
    const quote=(await db.query<{id:string}>("select public.save_quote($1,$2,null,$3,1000,'Fixture quote',null) id",[contact,lead,items])).rows[0].id;
    const q=(await db.query<{subtotal:number;discount_amount:number;net:number;tax:number;total:number;current_version:number}>("select subtotal,discount_amount,net,tax,total,current_version from public.quotes where id=$1",[quote])).rows[0];
    // raw=30003, surcharge=1500, subtotal31503, discount3150, net28353, tax5387, total33740.
    assert.deepEqual(q,{subtotal:31503,discount_amount:3150,net:28353,tax:5387,total:33740,current_version:1});
    await assert.rejects(db.query("update public.quotes set total=1 where id=$1",[quote]));
    await assert.rejects(db.query("update public.quote_versions set snapshot='{}' where quote_id=$1",[quote]));
    await assert.rejects(db.query("select public.save_quote($1,$2,$3,$4,0,null,0)",[contact,lead,quote,items]));
    await asUser(db,SUPERADMIN); await db.query("update public.pricing_rules set unit_price=20000 where id=$1",[rule]);
    await asUser(db,ADMIN);
    await db.query("select public.save_quote($1,$2,$3,$4,0,null,1)",[contact,lead,quote,items]);
    const historical=(await db.query<{n:number}>("select (snapshot->'quote'->>'total')::int n from public.quote_versions where quote_id=$1 and version=1",[quote])).rows[0].n;
    assert.equal(historical,33740);
    assert.equal((await db.query("select * from public.quote_versions where quote_id=$1",[quote])).rows.length,2);
    await assert.rejects(db.query("select public.set_quote_status($1,'accepted',2)",[quote]));
    await db.query("select public.set_quote_status($1,'sent',2)",[quote]); await db.query("select public.set_quote_status($1,'accepted',2)",[quote]);
    assert.equal((await db.query<{is_client:boolean}>("select is_client from public.contacts where id=$1",[contact])).rows[0].is_client,true);
    await assert.rejects(db.query("select public.save_quote($1,$2,$3,$4,0,null,2)",[contact,lead,quote,items]));
    const installation=(await db.query<{id:string}>("select public.create_installation($1,now()+interval '3 days',$2,'Fixture address','Fixture commune','{}','Fixture work') id",[quote,ADMIN])).rows[0].id;
    await assert.rejects(db.query("select public.create_installation($1,null,null,'Fixture address','Fixture commune','{}',null)",[quote]));
    await assert.rejects(db.query("update public.installations set approved_amount=1 where id=$1",[installation]));
    await db.query("select public.record_payment($1,1000,'Fixture transfer',null,now())",[installation]);
    assert.equal((await db.query<{payment_status:string}>("select payment_status from public.installations where id=$1",[installation])).rows[0].payment_status,'partial');
    const approved=(await db.query<{approved_amount:number}>("select approved_amount from public.installations where id=$1",[installation])).rows[0].approved_amount;
    await assert.rejects(db.query("select public.record_payment($1,$2,'Fixture transfer',null,now())",[installation,approved]));
    await db.query("select public.record_payment($1,$2,'Fixture transfer',null,now())",[installation,approved-1000]);
    assert.equal((await db.query<{payment_status:string}>("select payment_status from public.installations where id=$1",[installation])).rows[0].payment_status,'paid');
    await db.query("select public.set_installation_status($1,'completed','Completed fixture')",[installation]);
    await assert.rejects(db.query("select public.set_installation_status($1,'in_progress',null)",[installation]));
    await db.query("insert into public.warranties(installation_id,starts_on,duration_months,terms,created_by) values($1,current_date,12,'Fixture warranty terms',$2)",[installation,ADMIN]);
    const photo=`installations/${installation}/44444444-4444-4444-8444-444444444444.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('admin-documents',$1)",[photo]);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('admin-documents','anything/private.pdf')"));
    await db.query("insert into public.installation_photos(installation_id,path,stage,created_by) values($1,$2,'after',$3)",[installation,photo,ADMIN]);
    assert.equal((await db.query("delete from storage.objects where name=$1 returning id",[photo])).rows.length,0);
    const orphan=`installations/${installation}/55555555-5555-4555-8555-555555555555.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('admin-documents',$1)",[orphan]);
    assert.equal((await db.query("delete from storage.objects where name=$1 returning id",[orphan])).rows.length,1);
    await db.query("insert into public.reviews(display_name,rating,original_text,presentation_text,publication_consent,published,created_by) values('Fixture review',5,'Real fixture statement','Fixture public statement',true,true,$1)",[ADMIN]);
    await assert.rejects(db.query("insert into public.reviews(display_name,rating,original_text,published,created_by) values('No consent',5,'Fixture',true,$1)",[ADMIN]));
    // El CMS se retiró: el contenido web vive en el código y la tabla queda como histórico de solo lectura.
    await assert.rejects(db.query("insert into public.content_entries(key,data,published,created_by) values('fixture','{}',false,$1)",[ADMIN]));
    await assert.rejects(db.query("insert into public.content_entries(key,data,published,created_by) values('privacy_draft','{}',false,$1)",[ADMIN]));
    const privacyRequest=(await db.query<{id:string}>("insert into public.privacy_requests(contact_id,type,reason,created_by) values($1,'export','Fixture request',$2) returning id",[contact,ADMIN])).rows[0].id;
    assert.equal((await db.query("update public.privacy_requests set status='completed' where id=$1 returning id",[privacyRequest])).rows.length,0);
    const metrics=(await db.query<{value:{income:number;accepted_quotes:number;completed_installations:number}}>("select public.dashboard_metrics(now()-interval '1 day',now()+interval '1 day',now()) value")).rows[0].value;
    assert.equal(metrics.income,approved); assert.equal(metrics.accepted_quotes,1); assert.equal(metrics.completed_installations,1);
    await db.query("select public.log_contact_export($1)",[contact]);
    assert.equal((await db.query("select * from public.audit_logs where entity_id=$1 and action='export'",[contact])).rows.length,1);
    await assert.rejects(db.query("insert into public.notifications(kind,subject,body) values('lead_created','Spoof','Spoof')"));
    await db.query("insert into public.notifications(kind,subject,body) values('quote_email','Fixture quote','Fixture body')");
    await asUser(db,OUTSIDER);
    for(const table of ['contacts','leads','tasks','appointments','quotes','quote_versions','installations','payments','audit_logs']) assert.equal((await db.query(`select * from public.${table}`)).rows.length,0,table);
    await assert.rejects(db.query("select public.set_installation_status($1,'pending',null)",[installation]));
    await assert.rejects(db.query("select public.manage_profile($1,'Escalation','SUPERADMIN',true)",[OUTSIDER]));
    await assert.rejects(db.query("select public.dashboard_metrics(now()-interval '1 day',now()+interval '1 day',now())"));
    assert.equal((await db.query("select * from storage.objects")).rows.length,0);
    await db.exec("reset role;set role anon");
    assert.equal((await db.query("select id,display_name,presentation_text from public.reviews")).rows.length,1);
    await assert.rejects(db.query("select contact_id,original_text from public.reviews"));
    assert.equal((await db.query("select key,title,data from public.content_entries")).rows.length,0);
    await assert.rejects(db.query("select created_by,updated_by from public.content_entries"));
    await assert.rejects(db.query("select * from public.quotes"));
    await asUser(db,SUPERADMIN);
    await db.query("update public.privacy_requests set status='completed',resolution='Fixture resolution' where id=$1",[privacyRequest]);
    await db.query("insert into public.settings(key,value) values('fixture_security', '{\"nested\":{\"api_key\":\"fixture-never-real-secret\"}}')");
    const redacted=(await db.query<{changes:unknown}>("select changes from public.audit_logs where entity='settings' and entity_id='fixture_security'")).rows[0].changes;
    assert.ok(JSON.stringify(redacted).includes('[REDACTED]')); assert.ok(!JSON.stringify(redacted).includes('fixture-never-real-secret'));
    await assert.rejects(db.query("select public.manage_profile($1,'Self','ADMIN',true)",[SUPERADMIN]));
    await db.query("select public.manage_profile($1,'Fixture invited user','ADMIN',true)",[OUTSIDER]);
    await asUser(db,OUTSIDER); assert.ok((await db.query("select * from public.contacts")).rows.length>0);
    await asUser(db,SUPERADMIN); await db.query("select public.manage_profile($1,'Fixture invited user','ADMIN',false)",[OUTSIDER]);
    await asUser(db,OUTSIDER); assert.equal((await db.query("select * from public.contacts")).rows.length,0);
  } finally { await db.close(); }
});

test("first SUPERADMIN bootstrap is service-only, idempotent and never replaces existing administrators",async()=>{
  const db=await platformDatabase(false);
  try {
    await asUser(db,OUTSIDER);
    await assert.rejects(db.query("select public.bootstrap_admin_profile($1,'Unauthorized fixture')",[OUTSIDER]));
    await asService(db);
    await db.query("select public.bootstrap_admin_profile($1,'First fixture administrator')",[SUPERADMIN]);
    await db.query("select public.bootstrap_admin_profile($1,'Idempotent fixture administrator')",[SUPERADMIN]);
    await assert.rejects(db.query("select public.bootstrap_admin_profile($1,'Second fixture administrator')",[ADMIN]));
    assert.equal((await db.query("select * from public.profiles")).rows.length,1);
  } finally {await db.close();}
});

test("Cal webhook RPC is idempotent, handles email-only attendees and reschedules/cancels without fictitious phone",async()=>{
 const db=await platformDatabase();
 try {
  await asService(db);
  const payload={uid:"fixture-booking",contact:{name:"Fixture attendee",email:"cal@example.invalid"},starts_at:"2027-01-10T15:00:00Z",ends_at:"2027-01-10T16:00:00Z",service:"Fixture visit"};
  const sync=(key:string,event:string,data:unknown)=>db.query<{id:string|null}>("select public.sync_cal_booking($1,$2,$3) id",[key,event,JSON.stringify(data)]);
  const id=(await sync("fixture-event-1","BOOKING_CREATED",payload)).rows[0].id;
  assert.ok(id); assert.equal((await sync("fixture-event-1","BOOKING_CREATED",payload)).rows[0].id,id);
  assert.equal((await db.query("select * from public.appointments")).rows.length,1);
  assert.equal((await db.query<{phone:null}>("select phone from public.contacts")).rows[0].phone,null);
  assert.equal((await sync("fixture-event-2","BOOKING_RESCHEDULED",{...payload,uid:"fixture-booking-2",old_uid:payload.uid,starts_at:"2027-01-11T15:00:00Z",ends_at:"2027-01-11T16:00:00Z"})).rows[0].id,id);
  await sync("fixture-event-3","BOOKING_CANCELLED",{uid:"fixture-booking-2"});
  assert.equal((await db.query<{status:string}>("select status from public.appointments")).rows[0].status,"cancelled");
  assert.equal((await db.query("select * from public.webhook_events")).rows.length,3);
  await sync("fixture-event-late-cancel","BOOKING_CANCELLED",{uid:"cancelled-before-create",occurred_at:"2027-01-12T16:00:00Z"});
  const late=await sync("fixture-event-late-create","BOOKING_CREATED",{...payload,uid:"cancelled-before-create",occurred_at:"2027-01-12T15:00:00Z"});
  assert.equal(late.rows[0].id,null);
  assert.equal((await db.query("select * from public.appointments where cal_booking_uid='cancelled-before-create'")).rows.length,0);
  await asUser(db,ADMIN); await assert.rejects(sync("fixture-event-4","BOOKING_CREATED",payload));
  await asService(db);
  const intake={name:"Fixture public lead",email:"intake@example.invalid",phone:"+56900000001",service:"Fixture service",consent:"on",tracking:{utmSource:"fixture"}};
  const submit=()=>db.query<{id:string}>("select public.submit_public_lead($1,$2) id",[JSON.stringify(intake),"b".repeat(64)]);
  const leadId=(await submit()).rows[0].id;
  assert.ok(leadId);
  await submit();
  assert.equal((await db.query("select * from public.contacts where email='intake@example.invalid'")).rows.length,1);
  assert.equal((await db.query<{consent:boolean}>("select consent from public.contacts where email='intake@example.invalid'")).rows[0].consent,true);
  await asUser(db,ADMIN);
  assert.equal((await db.query("select * from public.lead_activities where lead_id=$1 and type='created'",[leadId])).rows.length,1);
  // La reserva Cal.com crea su oportunidad, pero su alerta queda cubierta por el aviso de agenda (sin correo duplicado).
  assert.equal((await db.query("select * from public.notifications where kind='lead_created' and status='pending'")).rows.length,2);
 } finally {await db.close();}
});
