#!/bin/bash

# Créer les répertoires nécessaires
mkdir -p public/img/icons

# Vérifier si Inkscape est installé
if command -v inkscape &> /dev/null; then
    echo "Utilisation d'Inkscape pour générer les icônes..."
    
    # Générer les icônes Android
    inkscape -w 192 -h 192 public/img/icons/favicon.svg -o public/img/icons/android-chrome-192x192.png
    inkscape -w 512 -h 512 public/img/icons/favicon.svg -o public/img/icons/android-chrome-512x512.png
    
    # Générer les icônes Android maskable
    inkscape -w 192 -h 192 public/img/icons/favicon.svg -o public/img/icons/android-chrome-maskable-192x192.png
    inkscape -w 512 -h 512 public/img/icons/favicon.svg -o public/img/icons/android-chrome-maskable-512x512.png
    
    # Générer les icônes Apple
    inkscape -w 60 -h 60 public/img/icons/favicon.svg -o public/img/icons/apple-touch-icon-60x60.png
    inkscape -w 76 -h 76 public/img/icons/favicon.svg -o public/img/icons/apple-touch-icon-76x76.png
    inkscape -w 120 -h 120 public/img/icons/favicon.svg -o public/img/icons/apple-touch-icon-120x120.png
    inkscape -w 152 -h 152 public/img/icons/favicon.svg -o public/img/icons/apple-touch-icon-152x152.png
    inkscape -w 180 -h 180 public/img/icons/favicon.svg -o public/img/icons/apple-touch-icon-180x180.png
    inkscape -w 180 -h 180 public/img/icons/favicon.svg -o public/img/icons/apple-touch-icon.png
    
    # Générer les favicons
    inkscape -w 16 -h 16 public/img/icons/favicon.svg -o public/img/icons/favicon-16x16.png
    inkscape -w 32 -h 32 public/img/icons/favicon.svg -o public/img/icons/favicon-32x32.png
    
    # Générer les icônes Microsoft
    inkscape -w 144 -h 144 public/img/icons/favicon.svg -o public/img/icons/msapplication-icon-144x144.png
    inkscape -w 150 -h 150 public/img/icons/favicon.svg -o public/img/icons/mstile-150x150.png

# Sinon, vérifier si ImageMagick est installé
elif command -v convert &> /dev/null; then
    echo "Utilisation d'ImageMagick pour générer les icônes..."
    
    # Générer les icônes Android
    convert -background none -resize 192x192 public/img/icons/favicon.svg public/img/icons/android-chrome-192x192.png
    convert -background none -resize 512x512 public/img/icons/favicon.svg public/img/icons/android-chrome-512x512.png
    
    # Générer les icônes Android maskable
    convert -background none -resize 192x192 public/img/icons/favicon.svg public/img/icons/android-chrome-maskable-192x192.png
    convert -background none -resize 512x512 public/img/icons/favicon.svg public/img/icons/android-chrome-maskable-512x512.png
    
    # Générer les icônes Apple
    convert -background none -resize 60x60 public/img/icons/favicon.svg public/img/icons/apple-touch-icon-60x60.png
    convert -background none -resize 76x76 public/img/icons/favicon.svg public/img/icons/apple-touch-icon-76x76.png
    convert -background none -resize 120x120 public/img/icons/favicon.svg public/img/icons/apple-touch-icon-120x120.png
    convert -background none -resize 152x152 public/img/icons/favicon.svg public/img/icons/apple-touch-icon-152x152.png
    convert -background none -resize 180x180 public/img/icons/favicon.svg public/img/icons/apple-touch-icon-180x180.png
    convert -background none -resize 180x180 public/img/icons/favicon.svg public/img/icons/apple-touch-icon.png
    
    # Générer les favicons
    convert -background none -resize 16x16 public/img/icons/favicon.svg public/img/icons/favicon-16x16.png
    convert -background none -resize 32x32 public/img/icons/favicon.svg public/img/icons/favicon-32x32.png
    
    # Générer les icônes Microsoft
    convert -background none -resize 144x144 public/img/icons/favicon.svg public/img/icons/msapplication-icon-144x144.png
    convert -background none -resize 150x150 public/img/icons/favicon.svg public/img/icons/mstile-150x150.png
else
    echo "Ni Inkscape ni ImageMagick ne sont installés. Veuillez installer l'un de ces outils pour générer les icônes."
    exit 1
fi

echo "Génération des icônes terminée !"
