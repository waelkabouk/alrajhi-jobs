file_path = 'c:/Users/waelk/OneDrive/Desktop/alrajhi-jobs/src/pages/JobDetails.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content_str = """            <div className="space-y-8 mt-8">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-2xl font-bold tracking-tight">{t("public.apply")}</h2>
                <div className="h-px bg-border flex-1"></div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                
                {/* 1. Personal Information */}
                <Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.personalInfo")}</h3>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-first-name" label={`${t("public.firstName")} *`} />
                        <Input id="f-first-name" {...register("first_name")} />
                        {errors.first_name && (
                          <p className="text-xs text-destructive">{errors.first_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-last-name" label={`${t("public.lastName")} *`} />
                        <Input id="f-last-name" {...register("last_name")} />
                        {errors.last_name && (
                          <p className="text-xs text-destructive">{errors.last_name.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-gender" label={t("public.gender")} />
                        <Select
                          value={genderVal}
                          onValueChange={(v) =>
                            setValue("gender", v as "male" | "female" | "unspecified")
                          }
                        >
                          <SelectTrigger id="f-gender">
                            <SelectValue>
                              {genderVal === "male" ? t("public.genderMale") : 
                               genderVal === "female" ? t("public.genderFemale") : 
                               t("public.genderUnspecified")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t("public.genderMale")}</SelectItem>
                            <SelectItem value="female">{t("public.genderFemale")}</SelectItem>
                            <SelectItem value="unspecified">{t("public.genderUnspecified")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-marital" label={t("public.maritalStatus")} />
                        <Select
                          value={maritalVal}
                          onValueChange={(v) =>
                            setValue(
                              "marital_status",
                              v as "single" | "married" | "divorced" | "widowed" | "unspecified"
                            )
                          }
                        >
                          <SelectTrigger id="f-marital">
                            <SelectValue>
                              {maritalVal === "single" ? t("public.maritalSingle") : 
                               maritalVal === "married" ? t("public.maritalMarried") : 
                               maritalVal === "divorced" ? t("public.maritalDivorced") : 
                               maritalVal === "widowed" ? t("public.maritalWidowed") : 
                               t("public.maritalUnspecified")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">{t("public.maritalSingle")}</SelectItem>
                            <SelectItem value="married">{t("public.maritalMarried")}</SelectItem>
                            <SelectItem value="divorced">{t("public.maritalDivorced")}</SelectItem>
                            <SelectItem value="widowed">{t("public.maritalWidowed")}</SelectItem>
                            <SelectItem value="unspecified">{t("public.maritalUnspecified")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-nationality" label={`${t("public.nationality")} *`} />
                        <Select
                          value={nationalityVal}
                          onValueChange={(v) => setValue("nationality", v)}
                        >
                          <SelectTrigger id="f-nationality">
                            <SelectValue placeholder={t("public.nationality")} />
                          </SelectTrigger>
                          <SelectContent>
                            {getCountries().map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.nationality && (
                          <p className="text-xs text-destructive">{errors.nationality.message}</p>
                        )}
                      </div>
                    </div>

                    {nationalityVal && nationalityVal !== "SA" && (
                      <div className="space-y-2 border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-md mt-4">
                        <FieldLabel htmlFor="f-iqama" label={`${t("public.transferableIqama", "Transferable Saudi Iqama")} *`} />
                        <Select
                          value={iqamaVal}
                          onValueChange={(v) => setValue("transferable_iqama", v as "yes" | "no")}
                        >
                          <SelectTrigger id="f-iqama" className="w-full md:w-1/2">
                            <SelectValue placeholder={t("common.select", "Select")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">{t("common.yes", "Yes")}</SelectItem>
                            <SelectItem value="no">{t("common.no", "No")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Contact Details */}
                <Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.contactDetails")}</h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-email" label={`${t("common.email")} *`} />
                        <Input id="f-email" type="email" {...register("email")} />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-phone" label={`${t("common.phone")} *`} />
                        <div className="flex gap-2">
                          <Select
                            value={countryCodeVal}
                            onValueChange={(v) => setValue("country_code", v)}
                          >
                            <SelectTrigger id="f-country-code" className="w-[130px]">
                              <SelectValue placeholder={t("common.code")} />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRY_CODES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex-1">
                            <Input id="f-phone" type="tel" {...register("phone_number")} />
                          </div>
                        </div>
                        {(errors.country_code || errors.phone_number) && (
                          <p className="text-xs text-destructive">
                            {errors.country_code?.message || errors.phone_number?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Location Details */}
                <Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.locationDetails")}</h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-res-country" label={`${t("public.countryOfResidence", "Country of Residence")} *`} />
                        <Select
                          value={resCountryVal}
                          onValueChange={(v) => {
                            setValue("residence_country", v);
                            setValue("residence_region", ""); // Reset region when country changes
                          }}
                        >
                          <SelectTrigger id="f-res-country">
                            <SelectValue placeholder={t("common.select", "Select")} />
                          </SelectTrigger>
                          <SelectContent>
                            {getCountries().map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.residence_country && (
                          <p className="text-xs text-destructive">{errors.residence_country.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-res-city" label={`${t("public.provinceRegion", "Province / Region")} *`} />
                        <Select
                          value={resCityVal}
                          onValueChange={(v) => setValue("residence_region", v)}
                          disabled={!resCountryVal}
                        >
                          <SelectTrigger id="f-res-city">
                            <SelectValue placeholder={t("common.select", "Select")} />
                          </SelectTrigger>
                          <SelectContent>
                            {getCitiesForCountry(resCountryVal).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.residence_region && (
                          <p className="text-xs text-destructive">{errors.residence_region.message}</p>
                        )}
                      </div>
                    </div>
                    
                    {resCityVal === "OTHER-CITY" && (
                      <div className="space-y-2 mt-6">
                        <FieldLabel htmlFor="f-other-city" label={t("public.specifyProvince", "Please specify")} />
                        <Input id="f-other-city" {...register("other_city")} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 4. Professional Details */}
                <Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.professionalDetails")}</h3>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-job-title" label={t("public.jobTitle")} />
                        <Input id="f-job-title" {...register("job_title")} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-exp" label={t("public.yearsExperience")} />
                        <Input
                          id="f-exp"
                          type="number"
                          min={0}
                          step={0.5}
                          {...register("experience_years")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-current-salary" label={t("public.currentSalary")} />
                        <Input id="f-current-salary" type="number" min={0} {...register("current_salary")} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-expected-salary" label={t("public.expectedSalary")} />
                        <Input id="f-expected-salary" type="number" min={0} {...register("expected_salary")} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-notice-period" label={t("public.noticePeriod", "Notice Period")} />
                        <Input 
                          id="f-notice-period" 
                          type="number"
                          min={0}
                          placeholder={t("public.noticePeriodPlaceholder", "e.g. 30")} 
                          {...register("notice_period")} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel htmlFor="f-qualifications" label={t("public.qualifications")} />
                      <Textarea
                        id="f-qualifications"
                        rows={2}
                        placeholder={t("public.qualificationsPlaceholder")}
                        {...register("qualifications")}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 5. Attachments & Notes */}
                <Card className="shadow-sm border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("public.attachments")}</h3>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="f-notes" label={t("public.applicantNotes")} />
                      <Textarea
                        id="f-notes"
                        rows={3}
                        placeholder={t("public.applicantNotesPlaceholder")}
                        {...register("notes")}
                      />
                    </div>

                    <div className="p-6 border-2 border-dashed rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center text-center">
                      <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                      <div className="space-y-2 w-full max-w-sm">
                        <Label htmlFor="cv-upload" className="text-base font-semibold cursor-pointer text-primary hover:underline">
                          {t("public.cvFile")} *
                        </Label>
                        <Input
                          id="cv-upload"
                          type="file"
                          accept=".pdf,.docx"
                          onChange={handleFileChange}
                          className="cursor-pointer file:cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground pt-1">
                          {t("public.uploadCvHint", "Supported formats: PDF, DOCX (Max 5MB)")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" size="lg" className="w-full md:w-auto px-8 py-6 text-lg" disabled={isSubmitting}>
                    {t("public.submitApplication")}
                  </Button>
                </div>
              </form>
            </div>\n"""

# lines 303 to 593 (0-indexed 302 to 593)
# wait, my original view had line 304 as <Card>, so line 303 in 0-indexed is <Card>.
# and line 593 in 1-indexed is </Card>. Let's verify start string on line 304.
if "<Card>" in lines[303]:
    lines = lines[:303] + [new_content_str] + lines[593:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Replaced by line indices!")
else:
    print("Line 304 is not <Card>, it is:", lines[303])
