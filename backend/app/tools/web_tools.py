from langchain_core.tools import tool
import httpx
import xml.etree.ElementTree as ET
import json

@tool
def get_latest_news() -> str:
    """Fetch the latest top news headlines and summaries from BBC News. Use this tool when the user asks about today's news, current events, or what is happening in the world."""
    url = "http://feeds.bbci.co.uk/news/rss.xml"
    try:
        response = httpx.get(url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
        
        root = ET.fromstring(response.text)
        channel = root.find("channel")
        
        if channel is None:
            return "Could not parse news feed."
            
        items = channel.findall("item")
        news_list = []
        
        # Get top 1 news item to save LLM tokens and per user request
        for item in items[:1]:
            title = item.find("title").text if item.find("title") is not None else "No title"
            description = item.find("description").text if item.find("description") is not None else "No description"
            
            news_list.append({
                "title": title,
                "summary": description
            })
            
        return json.dumps(news_list)
    except Exception as e:
        return f"Error fetching news: {str(e)}"

def get_web_tools():
    return [get_latest_news]
