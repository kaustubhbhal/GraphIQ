import os
from dotenv import load_dotenv
import re
import base64
import httpx
from PIL import Image

# Load environment variables
load_dotenv()

from langchain_anthropic import ChatAnthropic
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableParallel, RunnablePassthrough
from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.messages import HumanMessage

import json

# LangSmith Tracking
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")

class Model:
    def __init__(self):
        self.llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")
        self.output_parser = StrOutputParser()
        self.topic = None

        with open("./prompts/learnBST.txt") as f:
            initial_prompt = f.read()
        self.last_prompt = initial_prompt

        with open("./prompts/controller.txt") as f:
            self.controller_prompt = f.read()

        with open("./prompts/initial.txt") as f:
            self.past_prompts = f.read() + "\n"

        self.practice_problem = None

    def update_past_prompts(self, to_add: str):
        if len(self.past_prompts) > 200000:
            # summarize
            message = HumanMessage(
            content=[
                    {"type": "text", "text": f"Summarize the following text in a brief paragraph"},
                    {"type": "text", "text": f"{self.past_prompts}"},
                ],
            )
            response = self.llm.invoke([message])
            self.past_prompts = response
        self.past_prompts += to_add + "\n"

    def parse_mermaid(self, content):
        '''
        Given a Claude output, parse it for mermaid diagram code if it exists
        '''
        mermaid_pattern = r"```mermaid\n(.*?)\n```"
        match = re.search(mermaid_pattern, content, re.DOTALL)

        if match:
            mermaid_code = match.group(1)
            cleaned_text = re.sub(mermaid_pattern, '', content, flags=re.DOTALL).strip()
            return mermaid_code, cleaned_text
        else:
            return None, content
        
    def controller(self, message):
        # Prompt LLM with controller to figure out what user wants to do
        controller_template = ChatPromptTemplate.from_template("""
            {controller}
            {topic}
            {user_prompt}
        """)

        controller_chain = controller_template | self.llm | self.output_parser
        response = controller_chain.invoke({
            'controller': self.controller_prompt,
            'topic': str(self.topic),
            'user_prompt': message
        })

        if "explain concept" in response.lower():
            print("EXPLAIN")
            explain_template = ChatPromptTemplate.from_template("""
                {instructions}
                {topic}
                {message}
            """)

            with open("./prompts/explain.txt") as f:
                instructions = f.read()
            
            explain_chain = explain_template | self.llm | self.output_parser
            response = explain_chain.invoke({
                "instructions": instructions,
                "topic": self.topic,
                "message": message,
            })

            return response

        elif "switch topic" in response.lower():
            with open("./prompts/findTopic.txt") as f:
                prompt = f.read()
            topic_template = ChatPromptTemplate.from_template("""
                {prompt}
                {messages}
            """)
            topic_chain = topic_template | self.llm | self.output_parser
            response = topic_chain.invoke({
                "prompt": prompt,
                "messages": message,
            })

            if "no topic" in response:
                return {"diagram": None, "text": "Please choose a topic that you would like to learn more about"}
            self.topic = response

            return_string = f"It seems you would like to learn about {response} now. I can help by explaining the topic, providing you with interactive practice problems, or clarifying your understanding."
            return return_string

        elif "check work" in response.lower():
            print("CHECK")
            check_work_template = ChatPromptTemplate.from_template("""
                {instructions1}
                {example_pic}
                {instructions2}
                {example_pic_2}
                {instructions3}
                {problem}
                {picture}
            """)

            with open("./prompts/checkWork1.txt") as f:
                instructions1 = f.read()
            with open("./prompts/checkWork2.txt") as f:
                instructions2 = f.read()
            with open("./prompts/ex_solution.png", "rb") as f:
                example_pic = base64.b64encode(f.read()).decode("utf-8")
                # with open("./outputs/example_pic.txt", "w") as g:
                #     g.write(example_pic)
            with open("./prompts/ex_solution_2.png", "rb") as f:
                example_pic_2 = base64.b64encode(f.read()).decode("utf-8")
            with open("./prompts/checkWork3.txt") as f:
                instructions3 = f.read()

            # compress the file:
            uncompressed = Image.open('../public/drawing.png')
            width, height = uncompressed.size
            new_size = (width//2, height//2)
            resized_image = uncompressed.resize(new_size)
            resized_image.save('./prompts/ex_solution_3_comp.png', optimize=True, quality=50)
            with open("./prompts/ex_solution_3_comp.png", "rb") as f:
                example_pic_3 = base64.b64encode(f.read()).decode("utf-8")

            # Change to get this image from the frontend
            if self.practice_problem == None:
                return "Please complete a practice problem before checking your work"

            message = HumanMessage(
            content=[
                    {"type": "text", "text": f"{instructions1}"},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{example_pic}"},
                    },
                    {"type": "text", "text": f"{instructions2}"},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{example_pic_2}"},
                    },
                    {"type": "text", "text": f"{instructions3}"},
                    {"type": "text", "text": f"{self.practice_problem}"},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{example_pic_3}"},
                    },
                ],
            )
            response = self.llm.invoke([message])
            return response.content

        elif "need help/clarification" in response.lower():
            print("HELP")
            clarify_template = ChatPromptTemplate.from_template("""
                {instructions}
                {topic}
                {message}
            """)

            with open("./prompts/explain.txt") as f:
                instructions = f.read()
            
            clarify_chain = clarify_template | self.llm | self.output_parser
            response = clarify_chain.invoke({
                "instructions": instructions,
                "topic": self.topic,
                "message": message,
            })

            return response

        elif "practice problems" in response.lower():
            print("PP")
            # pp2 prompt to get concepts
            pp2_template = ChatPromptTemplate.from_template("""
                {instructions}
                {topic}
            """)
            with open("./prompts/pp2.txt") as f:
                instructions = f.read()
            ppt_chain = pp2_template | self.llm | self.output_parser
            concepts = ppt_chain.invoke({
                "instructions": instructions,
                "topic": self.topic,
            })
            
            select_concept_template = ChatPromptTemplate.from_template("""
                {instructions}
                {topic}
                {concepts}
                {message}
            """)
            with open("./prompts/selectConcept.txt") as f:
                instructions = f.read()
            select_concept_chain = select_concept_template | self.llm | self.output_parser
            selected_concept = select_concept_chain.invoke({
                "instructions": instructions,
                "topic": self.topic,
                "concepts": concepts,
                "message": message,
            })

            # feed concepts into practiceProblems prompt
            practice_problem_template = ChatPromptTemplate.from_template("""
                {instructions}
                {topic}
                {concepts}
            """)

            with open("./prompts/practiceProblems.txt") as f:
                instructions = f.read()

            practice_problem_chain = practice_problem_template | self.llm | self.output_parser
            response = practice_problem_chain.invoke({
                "instructions": instructions,
                "topic": self.topic,
                "concepts": selected_concept,
            })

            self.practice_problem = response

            return response
        else:
            print("GENERAL")
            general_template = ChatPromptTemplate.from_template("""
                {instructions}
                {topic}
                {message}
            """)

            with open("./prompts/general.txt") as f:
                instructions = f.read()
            
            general_chain = general_template | self.llm | self.output_parser
            response = general_chain.invoke({
                "instructions": instructions,
                "topic": self.topic,
                "history": self.past_prompts,
                "message": message,
            })

            return response

        return response

    def chat(self, messages):
        if self.topic == None:
            with open("./prompts/findTopic.txt") as f:
                prompt = f.read()
            topic_template = ChatPromptTemplate.from_template("""
                {prompt}
                {messages}
            """)
            topic_chain = topic_template | self.llm | self.output_parser
            response = topic_chain.invoke({
                "prompt": prompt,
                "messages": messages,
            })

            if "no topic" in response:
                return {"diagram": None, "text": "Please choose a topic that you would like to learn more about"}
            self.topic = response
            return_string = f"It seems you would like to learn about {response}. I can help by explaining the topic, providing you with interactive practice problems, or clarifying your understanding. How can I assist you today?"
            self.update_past_prompts(return_string)

            return_data = {
                "diagram": None,
                "text": return_string,
            }
            self.update_past_prompts(str(return_data))
            return return_data
        
        response = self.controller(messages)
        #print(response)
        diagram, text = self.parse_mermaid(response)

        return_data = {
            "diagram": diagram,
            "text": text,
        }

        return return_data


#with open("../prompts/initial.txt") as f:
    #print(f.read())
#my_model = Model()
# while (True):
    # prompt = input("Human: ")
    # print("Agent:", my_model.chat(prompt))
    