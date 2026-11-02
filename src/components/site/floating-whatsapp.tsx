import { WhatsAppIcon } from "@/components/ui/icons";
import { whatsappUrl } from "@/lib/links";

export function FloatingWhatsApp({ phoneE164 }: { phoneE164: string }) {
  return (
    <a
      href={whatsappUrl(phoneE164, "Hola Iron Mallas, quiero cotizar una instalación.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#1fa855] text-white shadow-[0_10px_30px_-5px_rgb(31_168_85/0.6)] transition hover:scale-105 hover:bg-[#1b9449] sm:bottom-6 sm:right-6 sm:size-16"
    >
      <WhatsAppIcon size={30} />
    </a>
  );
}
