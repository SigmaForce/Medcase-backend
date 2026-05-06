interface BuildEmailHtmlParams {
  content: string
  hero: { label: string; title: string; subtitle: string }
}

export const buildEmailHtml = ({ content, hero }: BuildEmailHtmlParams): string =>
  `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>:root { color-scheme: light only; }</style>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#EFF3F1;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EFF3F1;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #C8E6D8;">

          <!-- Logo Header -->
          <tr>
            <td style="background-color:#FFFFFF;padding:24px 40px;text-align:center;">
              <img src="https://logo.airevalid.workers.dev/logo.svg" alt="MedCase" width="140" style="display:block;margin:0 auto;height:auto;border:0;" />
            </td>
          </tr>

          <!-- Hero Header -->
          <tr>
            <td style="background-color:#08885D;padding:36px 40px 40px;text-align:center;border-radius:20px 20px 0 0;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.65);letter-spacing:2px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${hero.label}</p>
              <h1 style="margin:0 0 14px;font-size:30px;font-weight:700;color:#FFFFFF;line-height:1.2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${hero.title}</h1>
              <p style="margin:0 auto;font-size:15px;color:rgba(255,255,255,0.82);line-height:1.6;max-width:440px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${hero.subtitle}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F6FAF8;border-top:1px solid #C8E6D8;padding:22px 40px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:12px;color:#587A6F;line-height:1.8;">
                &copy; ${new Date().getFullYear()} MedCase &middot; Todos os direitos reservados<br>
                D&uacute;vidas? <a href="mailto:suporte@medcase.com" style="color:#08885D;text-decoration:underline;">suporte@medcase.com</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
