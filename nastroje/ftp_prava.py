"""Nastaví práva nahraného webu na Wedosu: složky 755, soubory 644.

FTP-Deploy-Action nahrává se službou vsftpd na Wedosu s právy 750/640 a skupinou uživatele,
kterou webový server nepřečte („Server unable to read htaccess file“, 403). Zjištěno 7. 11. 2026.
Použití: python ftp_prava.py /www/subdom/novy   (údaje z proměnných FTP_SERVER, FTP_UZIVATEL, FTP_HESLO)
"""
import ftplib, os, sys

def prava(f, cesta, pocet):
    radky = []
    f.retrlines("LIST -a " + cesta, radky.append)
    for r in radky:
        casti = r.split(None, 8)
        if len(casti) < 9 or casti[8] in (".", ".."):
            continue
        jmeno, slozka = casti[8], r.startswith("d")
        plna = cesta.rstrip("/") + "/" + jmeno
        chci = "drwxr-xr-x" if slozka else "-rw-r--r--"
        if jmeno == ".ftp-deploy-sync-state.json":
            chci = "-rw-r-----"
        if casti[0][:10] != chci:
            f.sendcmd("SITE CHMOD %s %s" % ("755" if slozka else ("640" if chci.endswith("---") else "644"), plna))
            pocet[0] += 1
        if slozka:
            prava(f, plna, pocet)

def main():
    koren = sys.argv[1]
    f = ftplib.FTP_TLS(os.environ.get("FTP_SERVER", "203920.w20.wedos.net"), timeout=60)
    f.login(os.environ["FTP_UZIVATEL"], os.environ["FTP_HESLO"])
    f.prot_p()
    f.sendcmd("SITE CHMOD 755 " + koren)
    pocet = [0]
    try:
        prava(f, koren, pocet)
    except ftplib.error_perm as e:
        if "522" not in str(e):
            raise
        # vsftpd na Wedosu chce u FTPS opakované TLS sezení, které ftplib neumí – výpis tedy bez šifrování dat
        f.quit()
        f = ftplib.FTP(os.environ.get("FTP_SERVER", "203920.w20.wedos.net"), timeout=60)
        f.login(os.environ["FTP_UZIVATEL"], os.environ["FTP_HESLO"])
        prava(f, koren, pocet)
    f.quit()
    print("Změněno práv:", pocet[0])

if __name__ == "__main__":
    main()
