import re

file_path = r"c:\Users\waelk\OneDrive\Desktop\alrajhi-jobs\src\pages\JobDetails.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix RTL layout for Iqama section
content = content.replace(
    'border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-md',
    'border-s-4 border-primary ps-4 py-2 bg-primary/5 rounded-e-md'
)

# Update SelectTriggers without className
selects = [
    '<SelectTrigger id="f-gender">',
    '<SelectTrigger id="f-marital">',
    '<SelectTrigger id="f-nationality">',
    '<SelectTrigger id="f-res-country">',
    '<SelectTrigger id="f-res-city">'
]

for s in selects:
    new_s = s.replace('>', ' className="bg-background/50 backdrop-blur-sm focus:ring-primary/30 transition-all">')
    content = content.replace(s, new_s)

# Update SelectTriggers with className
content = content.replace(
    '<SelectTrigger id="f-iqama" className="w-full md:w-1/2">',
    '<SelectTrigger id="f-iqama" className="w-full md:w-1/2 bg-background/50 backdrop-blur-sm focus:ring-primary/30 transition-all">'
)
content = content.replace(
    '<SelectTrigger id="f-country-code" className="w-[100px] sm:w-[130px] shrink-0">',
    '<SelectTrigger id="f-country-code" className="w-[100px] sm:w-[130px] shrink-0 bg-background/50 backdrop-blur-sm focus:ring-primary/30 transition-all">'
)

# Update Textareas
content = content.replace(
    'placeholder={t("public.qualificationsPlaceholder")}',
    'placeholder={t("public.qualificationsPlaceholder")}\n                        className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all"'
)
content = content.replace(
    'placeholder={t("public.applicantNotesPlaceholder")}',
    'placeholder={t("public.applicantNotesPlaceholder")}\n                        className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all"'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
