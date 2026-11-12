import "server-only";
import Image from "next/image";
import {requireAdmin} from "@/lib/auth";
import {ActionForm} from "@/components/admin/action-form";
import {PhotoInput} from "@/components/admin/photo-input";
import {Field,Panel,fieldClass} from "@/features/crm/ui";
import type {TechnicalAssessment,ZoneKind} from "@/lib/supabase/database.types";
import {AssessmentForm} from "./form";
import {uploadAssessmentPhoto} from "./actions";
import {PHOTO_STAGES} from "./schema";

export async function loadAssessment(target:"appointment"|"installation",id:string){
  const {db}=await requireAdmin();
  const result=await db.from("technical_assessments").select("*").eq(target==="appointment"?"appointment_id":"installation_id",id).maybeSingle();
  if(result.error)throw new Error("No se pudo cargar la ficha técnica.");
  return result.data as TechnicalAssessment|null;
}

export async function AssessmentPanel({target,targetId,assessment,defaultZone,photos=true}:{target:"appointment"|"installation";targetId:string;assessment:TechnicalAssessment|null;defaultZone?:ZoneKind|null;photos?:boolean}){
  const {db}=await requireAdmin();
  const rows=assessment&&photos?await db.from("assessment_photos").select("*").eq("assessment_id",assessment.id).order("created_at"):{data:[],error:null};
  if(rows.error)throw new Error("No se pudieron cargar las fotografías.");
  const signed=await Promise.all(rows.data.map(async p=>({photo:p,url:(await db.storage.from("admin-documents").createSignedUrl(p.path,300)).data?.signedUrl})));
  return <>
    <Panel title="Evaluación técnica"><AssessmentForm key={assessment?.updated_at??"new"} target={target} targetId={targetId} assessment={assessment} defaultZone={defaultZone}/></Panel>
    {photos&&<Panel title="Fotografías de la evaluación (privadas)">
      {!assessment?<p className="text-sm text-ink-soft">Guarda la ficha técnica para adjuntar fotografías.</p>:<>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">{signed.map(({photo,url})=><figure key={photo.id}>{url?<a href={url} target="_blank" rel="noreferrer"><Image src={url} width={480} height={360} unoptimized referrerPolicy="no-referrer" className="aspect-[4/3] rounded-xl object-cover" alt={photo.caption||`Fotografía ${PHOTO_STAGES[photo.stage]}`}/></a>:<p>Foto no disponible</p>}<figcaption className="text-sm"><strong>{PHOTO_STAGES[photo.stage]}</strong>{photo.caption?` · ${photo.caption}`:""}</figcaption></figure>)}</div>
        {!signed.length&&<p className="mb-4 text-sm text-ink-soft">Sin fotografías registradas.</p>}
        <ActionForm action={uploadAssessmentPhoto} label="Subir fotografía privada"><input type="hidden" name="assessment" value={assessment.id}/><input type="hidden" name="target" value={target}/><input type="hidden" name="target_id" value={targetId}/>
          <Field label="Etapa"><select name="stage" className={fieldClass}>{Object.entries(PHOTO_STAGES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Descripción"><input className={fieldClass} name="caption" maxLength={500}/></Field>
          <Field label="Fotografía (se optimiza y se eliminan metadatos)"><PhotoInput className={fieldClass}/></Field></ActionForm>
      </>}
    </Panel>}
  </>;
}
