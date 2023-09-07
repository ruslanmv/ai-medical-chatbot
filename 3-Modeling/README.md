# Part 3 - Modeling of Free Doctor with AI

[back](../README.md)

In ordering to give a better diagnosis for each patient. It is necessary analize the flow of the data.

The standard procedure for a Doctor is:
1) Generation of the general clinic history. ( With Anamnesis.)
  
2)  Classification of the health problem.
Depending of the classification of the medicine area.
We can go deeply with an additional custom clinic history.

3. Given the whole description of each patient we should include
   the description of the patient, what is asking for.

4. Depending of the situation of the patient with all information individual collected
   it is possible give medical diagnosis for a general case.

5. If is needed we can go futher for the special case and
   repeat the step 4.

It is recommendable have a clinic history for each patient is treated in this program.

A clinical history is an essential component of a patient's medical record and provides a concise overview of the patient's medical background, including their past illnesses, surgeries, medications, allergies, and family medical history. Here's a sample format for a clinical history:

```
[Patient Information]
- Full Name: [Patient's Full Name]
- Date of Birth: [Patient's Date of Birth]
- Gender: [Patient's Gender]
- Address: [Patient's Address]
- Phone Number: [Patient's Contact Number]

[Chief Complaint]
- [Description of the patient's main reason for seeking medical attention]

[Present Illness]
- [Detailed description of the current illness or symptoms, including their onset, duration, severity, and any relevant factors]

[Medical History]
- Past Medical Conditions:
  - [List any significant medical conditions the patient has had, including dates of diagnosis]
- Surgeries/Procedures:
  - [List any surgeries or medical procedures the patient has undergone, including dates]
- Medications:
  - [List current medications, dosages, and frequency]
- Allergies:
  - [List any allergies the patient has, including medication, food, or environmental allergies]
- Immunizations:
  - [Include information on relevant vaccinations and their dates]

[Family Medical History]
- [List any significant medical conditions that run in the patient's family, such as heart disease, diabetes, cancer, etc.]

[Social History]
- Occupation: [Patient's occupation]
- Tobacco Use: [Specify if the patient smokes or uses tobacco products]
- Alcohol Use: [Specify if the patient consumes alcohol and if so, how often and in what quantities]
- Drug Use: [Specify if the patient uses recreational drugs or has a history of drug use]
- Diet: [Provide information about the patient's dietary habits, including any special diets]
- Exercise: [Describe the patient's level of physical activity]

[Review of Systems]
- [List and briefly describe the patient's symptoms or concerns related to various body systems, including cardiovascular, respiratory, gastrointestinal, musculoskeletal, etc.]

[Social and Environmental History]
- [Include information about the patient's living situation, relationships, and any environmental factors that may be relevant to their health]

[Psychosocial History]
- [Note any significant mental health history or psychosocial stressors]

[Sexual History]
- [Include relevant sexual history information if applicable]

[Substance Use History]
- [Detail any history of alcohol or substance abuse, if applicable]

[Physical Examination Findings]
- [Summarize any relevant physical examination findings, including vital signs, general appearance, and specific organ system assessments]

[Assessment and Plan]
- [Provide a brief assessment of the patient's current medical condition and a plan for further evaluation and treatment]

[Provider's Name and Credentials]
- [Name of the healthcare provider]
- [Credentials, such as MD, DO, NP, PA]

[Date]
- [Date of the clinical history]

[Signature]
- [Signature of the healthcare provider]
```

This format can be customized to fit the specific requirements of a healthcare facility or the preferences of the healthcare provider. It should be thorough and comprehensive to ensure that all relevant information is documented accurately.





















We can install Sentence BERT using:

```
!pip install sentence-transformers
```

#### Step 1:

We will then load the pre-trained BERT model. There are many other pre-trained models available. You can find the full list of models [here.](https://github.com/UKPLab/sentence-transformers/blob/master/docs/pretrained-models/sts-models.md)

```python
from sentence_transformers import SentenceTransformer
sbert_model = SentenceTransformer('bert-base-nli-mean-tokens')
```

#### Step 2:

We will then encode the provided sentences. We can also display the sentence vectors(just uncomment the code below)

```python
sentence_embeddings = model.encode(sentences)
#print('Sample BERT embedding vector - length', len(sentence_embeddings[0]))
#print('Sample BERT embedding vector - note includes negative values', sentence_embeddings[0])
```

####  

#### Step 3:

Then we will define a test query and encode it as well:

```python
query = "I had pizza and pasta"
query_vec = model.encode([query])[0]
```

#### Step 4:

We will then compute the cosine similarity using scipy. We will retrieve the similarity values between the sentences and our test query:

```python
for sent in sentences:
  sim = cosine(query_vec, model.encode([sent])[0])
  print("Sentence = ", sent, "; similarity = ", sim)
```

![img](assets/images/posts/README/sbert_sim.png)

There you go, we have obtained the similarity between the sentences in our text and our test sentence. A crucial point to note is that SentenceBERT is pretty slow if you want to train it from scratch.