import re

file_path = r"c:\Users\waelk\OneDrive\Desktop\alrajhi-jobs\src\pages\JobDetails.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace wrapper
content = content.replace(
    '<div className="min-h-screen bg-background">',
    '<div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background selection:bg-primary/20 relative">\n      <div className="absolute top-0 -left-1/4 w-1/2 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />\n      <div className="absolute bottom-0 -right-1/4 w-1/2 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />'
)

# Main container padding
content = content.replace(
    '<main className="container max-w-7xl py-10">',
    '<main className="container max-w-7xl py-12 relative z-10">'
)

# Job description card
content = content.replace(
    '<Card className="border-border/50 shadow-sm bg-card/50 overflow-hidden">',
    '<Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20">'
)

content = content.replace(
    '<CardHeader className="pb-3 border-b border-border/50 bg-muted/20 px-4 py-3">',
    '<CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-r from-muted/50 to-muted/20 px-4 py-4">'
)

content = content.replace(
    '<CardTitle className="text-base flex items-center gap-2 font-bold">',
    '<CardTitle className="text-base flex items-center gap-3 font-bold">\n                      <div className="p-1.5 rounded bg-primary/10 text-primary">\n                        <Briefcase className="h-4 w-4" />\n                      </div>'
)

# Remove the Briefcase from inside CardTitle as we added it wrapped in a div above
content = content.replace(
    '<Briefcase className="h-4 w-4 text-primary" />\n                      {t("public.description")}',
    '{t("public.description")}'
)

# Update Form Section Cards
# Section 1
content = content.replace(
    '''<Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.personalInfo")}</h3>
                  </div>''',
    '''<Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <User className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.personalInfo")}</h3>
                  </div>'''
)

# Section 2
content = content.replace(
    '''<Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.contactDetails")}</h3>
                  </div>''',
    '''<Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Phone className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.contactDetails")}</h3>
                  </div>'''
)

# Section 3
content = content.replace(
    '''<Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.locationDetails")}</h3>
                  </div>''',
    '''<Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.locationDetails")}</h3>
                  </div>'''
)

# Section 4
content = content.replace(
    '''<Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.professionalDetails")}</h3>
                  </div>''',
    '''<Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.professionalDetails")}</h3>
                  </div>'''
)

# Section 5
content = content.replace(
    '''<Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.attachments")}</h3>
                  </div>''',
    '''<Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.attachments")}</h3>
                  </div>'''
)

# Update Submit Button
content = content.replace(
    '<Button type="submit" size="lg" className="w-full md:w-auto px-8 py-6 text-lg" disabled={isSubmitting}>',
    '<Button type="submit" size="lg" className="w-full md:w-auto px-10 py-6 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300" disabled={isSubmitting}>'
)

# Form title section update
content = content.replace(
    '''<div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">{t("public.apply")}</h2>
                <div className="h-px bg-border flex-1"></div>
              </div>''',
    '''<div className="flex items-center gap-4 group">
                <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">{t("public.apply")}</h2>
                <div className="h-px bg-gradient-to-r from-border to-transparent flex-1 transition-all duration-500 group-hover:from-primary/30"></div>
              </div>'''
)

# Update Job Title Area
content = content.replace(
    '''<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">''',
    '''<h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/80">'''
)

# Update Job Tags
content = content.replace(
    '''<div className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full text-secondary-foreground text-xs font-semibold border border-secondary">''',
    '''<div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded text-secondary-foreground text-sm font-semibold border border-border/50 shadow-sm hover:border-primary/30 transition-colors">'''
)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
