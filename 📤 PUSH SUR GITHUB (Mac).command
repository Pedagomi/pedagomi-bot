#!/bin/bash
# Pousse toutes les modifications locales du frontend sur GitHub
# (ce qui déclenche le redéploiement automatique Vercel)

cd "$(dirname "$0")"

clear
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   📤  PUSH FRONTEND → GITHUB → VERCEL                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Vérifier git
if ! command -v git &> /dev/null; then
    echo "❌ git n'est pas installé. Installe Xcode Command Line Tools :"
    echo "   → Ouvre Terminal et tape : xcode-select --install"
    read -p "Appuyez sur Entrée..."
    exit 1
fi

# Initialiser git si besoin
if [ ! -d ".git" ]; then
    echo "🔧 Première init du repo local..."
    git init -q
    git branch -M main
    git remote add origin https://github.com/Pedagomi/pedagomi-bot.git
    echo "✅ Repo initialisé"
fi

# Vérifier qu'on a bien la bonne remote
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)
if [ "$CURRENT_REMOTE" != "https://github.com/Pedagomi/pedagomi-bot.git" ]; then
    git remote set-url origin https://github.com/Pedagomi/pedagomi-bot.git 2>/dev/null || \
    git remote add origin https://github.com/Pedagomi/pedagomi-bot.git
fi

# Nettoyer tous les locks git restés d'un process précédent
for lock in .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock .git/config.lock; do
    if [ -f "$lock" ]; then
        echo "🔓 Suppression du lock : $lock"
        rm -f "$lock"
    fi
done

echo "📝 Status des fichiers modifiés :"
echo "----------------------------------------"
git status --short
echo "----------------------------------------"
echo ""

# Ajouter tous les fichiers
git add -A

# Vérifier si il y a des changements à commit
if git diff --cached --quiet; then
    echo "ℹ️  Aucune modification locale à pousser."
    echo ""
    echo "Si tu veux quand même forcer une synchro depuis GitHub :"
    echo "  git pull origin main"
    echo ""
    read -p "Appuyez sur Entrée pour fermer..."
    exit 0
fi

# Commit
MSG="Update frontend — $(date +%Y-%m-%d\ %H:%M)"
git commit -q -m "$MSG"
echo "✅ Commit local créé : $MSG"
echo ""

# Fetch + rebase avant de push (au cas où le remote a avancé)
echo "🔄 Synchronisation avec GitHub..."
git fetch origin main 2>/dev/null
git pull --rebase origin main 2>/dev/null || true

# Push
echo ""
echo "📤 Push vers GitHub..."
echo ""
echo "   Si Git te demande un mot de passe, utilise un"
echo "   Personal Access Token (pas ton mot de passe GitHub)."
echo "   Génère-en un sur : https://github.com/settings/tokens/new"
echo ""

if git push -u origin main 2>&1; then
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║   ✨  POUSSÉ AVEC SUCCÈS !                              ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "  ✓ GitHub à jour : https://github.com/Pedagomi/pedagomi-bot"
    echo "  ✓ Vercel va redéployer automatiquement (~2 min)"
    echo "  ✓ Interface finale sur : https://pedagomi-bot.vercel.app"
else
    echo ""
    echo "⚠️  Le push a échoué. Causes possibles :"
    echo "   • Tu n'as pas de PAT GitHub (génère-en un)"
    echo "   • Le Keychain Mac a mémorisé un ancien mot de passe"
    echo ""
    echo "   Solution : ouvre Terminal et tape :"
    echo "     git credential-osxkeychain erase"
    echo "     host=github.com"
    echo "     protocol=https"
    echo ""
    echo "   Puis réessaie."
fi

echo ""
read -p "Appuyez sur Entrée pour fermer..."
