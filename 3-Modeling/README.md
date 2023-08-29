# Part 3 - Modeling of Free Doctor with AI

[back](../README.md)

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