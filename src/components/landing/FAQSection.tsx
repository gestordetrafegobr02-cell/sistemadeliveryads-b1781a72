import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

export function FAQSection() {
  const faqs = [
    {
      question: 'Vou ser cobrado automaticamente após os 7 dias?',
      answer: 'Não! Após os 7 dias, seu painel apenas será pausado. Você só assina os R$ 97/mês se o sistema realmente trouxer resultados para o seu delivery. Não pedimos cartão de crédito para iniciar o teste.',
    },
    {
      question: 'Qual a diferença para o iFood e outros apps?',
      answer: 'A principal diferença é que aqui você paga ZERO TAXA por venda. Enquanto iFood e similares cobram de 12% a 27% por pedido, no nosso sistema você fica com 100% do lucro. Pagamos apenas uma mensalidade fixa de R$ 97.',
    },
    {
      question: 'Preciso de conhecimento técnico para usar?',
      answer: 'Não! O sistema foi feito para ser simples. Em menos de 5 minutos você cadastra seus produtos e já pode começar a receber pedidos pelo WhatsApp. Oferecemos suporte via WhatsApp para qualquer dúvida.',
    },
    {
      question: 'Como funciona o recebimento dos pedidos?',
      answer: 'Os pedidos chegam diretamente no seu WhatsApp, já formatados com todos os detalhes: nome do cliente, itens, endereço e forma de pagamento. Você também pode acompanhar tudo pelo painel administrativo.',
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer: 'Sim! Não existe fidelidade nem multa. Se por qualquer motivo você quiser cancelar, basta parar de pagar. Simples assim.',
    },
    {
      question: 'O sistema funciona para qualquer tipo de delivery?',
      answer: 'Sim! Hamburguerias, pizzarias, açaiterias, restaurantes, hortifrutis... Nosso sistema se adapta a qualquer tipo de negócio de delivery ou retirada.',
    },
  ];

  return (
    <section className="py-20 px-4 md:px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4" />
            Tire suas dúvidas
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-neutral-500 text-lg">
            Tudo que você precisa saber antes de começar
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-neutral-50 rounded-2xl border border-neutral-200 px-6 data-[state=open]:bg-white data-[state=open]:shadow-md transition-all"
            >
              <AccordionTrigger className="text-left font-medium text-neutral-900 hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-neutral-600 leading-relaxed pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
