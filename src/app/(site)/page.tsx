import {HomeContent} from "@/components/site/home-content";
import {Reviews} from "@/components/site/reviews";
import {getPublicContent} from "@/lib/content";
export default async function HomePage(){
  const content=await getPublicContent();
  return <><HomeContent content={content.site}/><Reviews reviews={content.reviews}/></>;
}
