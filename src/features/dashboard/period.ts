import { z } from "zod";
import { chileToday } from "@/features/quotes/date";
import { fromSantiagoInput } from "@/features/crm/time";
export type DashboardPeriod={fromDate:string;toDate:string;from:string;to:string};
function dayStart(date:string){
  try{return fromSantiagoInput(`${date}T00:00`);}catch{return fromSantiagoInput(`${date}T01:00`);}
}
function followingDay(date:string){
  const [year,month,day]=date.split("-").map(Number);
  return new Date(Date.UTC(year,month-1,day+1)).toISOString().slice(0,10);
}
export function dashboardPeriod(from:unknown,to:unknown,now=new Date()):DashboardPeriod{
  const today=chileToday(now);const [year,month]=today.split("-").map(Number);
  const endOfMonth=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
  const fromDate=from===undefined||from===""?`${today.slice(0,7)}-01`:z.iso.date().parse(from);
  const toDate=to===undefined||to===""?endOfMonth:z.iso.date().parse(to);
  if(fromDate>toDate||fromDate<"2000-01-01"||toDate>"2100-12-31")throw new Error("Selecciona un período válido entre 2000 y 2100.");
  return {fromDate,toDate,from:dayStart(fromDate),to:dayStart(followingDay(toDate))};
}
